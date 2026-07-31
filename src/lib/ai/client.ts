export interface AIProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  duration: number;
}

/**
 * Parse a data URL (data:image/jpeg;base64,...) into mime + base64.
 * Returns null if input is not a data URL.
 */
function parseDataUrl(url: string): { mimeType: string; base64: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

/**
 * Read a photo (local file path or HTTP URL) and convert it to a data URL
 * suitable for both OpenAI-style vision APIs and Gemini inline_data.
 *
 * - Relative `/api/uploads/...` paths are resolved against local FS.
 * - Absolute http(s) URLs are fetched.
 * - `data:` URLs pass through unchanged.
 */
export async function photoToDataUrl(
  photoUrl: string,
  fallbackMimeType = 'image/jpeg'
): Promise<string> {
  // Already a data URL
  if (photoUrl.startsWith('data:')) return photoUrl;

  // Absolute HTTP URL → fetch
  if (/^https?:\/\//i.test(photoUrl)) {
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`fetch photo failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || fallbackMimeType;
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  // Local upload URL — read from FS
  const { readFile } = await import('fs/promises');
  const { join, resolve, normalize } = await import('path');
  const baseDir = resolve(
    process.env.LOCAL_STORAGE_PATH || join(process.cwd(), 'public', 'uploads')
  );
  let relativePath: string | null = null;
  if (photoUrl.startsWith('/api/uploads/')) {
    relativePath = photoUrl.replace('/api/uploads/', '');
  } else if (photoUrl.startsWith('/uploads/')) {
    relativePath = photoUrl.replace('/uploads/', '');
  } else if (photoUrl.startsWith('/')) {
    relativePath = photoUrl.slice(1);
  } else {
    relativePath = photoUrl;
  }
  const fullPath = normalize(resolve(baseDir, relativePath));
  if (!fullPath.startsWith(baseDir)) {
    throw new Error(`photo path escapes upload dir: ${photoUrl}`);
  }
  const buf = await readFile(fullPath);
  const ext = (fullPath.split('.').pop() || '').toLowerCase();
  const extToMime: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const mime = extToMime[ext] || fallbackMimeType;
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export class AIClient {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /** Returns true if this client is configured to talk to Google Gemini. */
  isGoogle(): boolean {
    return this.config.provider === 'google';
  }

  /** True if this client has a real AI API key configured (not just heuristics). */
  hasApiKey(): boolean {
    return !!this.config.apiKey && !this.config.apiKey.startsWith('your-');
  }

  /**
   * Analyze an image. `imageUrlOrDataUrl` may be:
   *   - an http(s) URL (for OpenAI/OpenRouter providers)
   *   - a `data:` URL containing base64 image bytes (works for ALL providers;
   *     Gemini parses it into inline_data, OpenAI passes it as image_url.url)
   */
  async analyzeImage(
    imageUrlOrDataUrl: string,
    prompt: string,
    model?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const defaultVisionModel = this.isGoogle()
      ? 'gemini-2.0-flash'
      : this.config.provider === 'zhipu'
        ? 'glm-4.6v-flash'
        : 'gpt-4o-vision';
    const actualModel = model || process.env.VISION_MODEL || defaultVisionModel;

    try {
      if (this.isGoogle()) {
        return await this.analyzeImageGemini(imageUrlOrDataUrl, prompt, actualModel, startTime);
      }
      return await this.analyzeImageOpenAI(imageUrlOrDataUrl, prompt, actualModel, startTime);
    } catch (error) {
      console.error('AI analyzeImage error:', error);
      throw error;
    }
  }

  /** OpenAI-compatible chat/completions vision call (OpenRouter / OpenAI / Anthropic-via-OR). */
  private async analyzeImageOpenAI(
    imageUrl: string,
    prompt: string,
    actualModel: string,
    startTime: number
  ): Promise<AIResponse> {
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      model: actualModel,
      duration: Date.now() - startTime,
    };
  }

  /** Gemini generateContent vision call with inline_data base64. */
  private async analyzeImageGemini(
    imageUrlOrDataUrl: string,
    prompt: string,
    actualModel: string,
    startTime: number
  ): Promise<AIResponse> {
    const parsed = parseDataUrl(imageUrlOrDataUrl);
    if (!parsed) {
      throw new Error(
        `Gemini provider requires a data: URL (base64 image). Got: ${imageUrlOrDataUrl.slice(0, 60)}...`
      );
    }

    const endpoint = `${this.getBaseUrl()}/models/${actualModel}:generateContent?key=${this.config.apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: parsed.mimeType, data: parsed.base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || '')
      .join('') || '';

    return {
      content,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      model: actualModel,
      duration: Date.now() - startTime,
    };
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    model?: string,
    temperature: number = 0.8
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const defaultTextModel = this.isGoogle()
      ? 'gemini-2.0-flash'
      : this.config.provider === 'zhipu'
        ? 'glm-4.7-flash'
        : 'gpt-4o';
    const actualModel = model || process.env.WRITER_MODEL || defaultTextModel;

    try {
      if (this.isGoogle()) {
        return await this.generateTextGemini(prompt, systemPrompt, actualModel, temperature, startTime);
      }
      return await this.generateTextOpenAI(prompt, systemPrompt, actualModel, temperature, startTime);
    } catch (error) {
      console.error('AI generateText error:', error);
      throw error;
    }
  }

  private async generateTextOpenAI(
    prompt: string,
    systemPrompt: string | undefined,
    actualModel: string,
    temperature: number,
    startTime: number
  ): Promise<AIResponse> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages,
        max_tokens: 3000,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      model: actualModel,
      duration: Date.now() - startTime,
    };
  }

  private async generateTextGemini(
    prompt: string,
    systemPrompt: string | undefined,
    actualModel: string,
    temperature: number,
    startTime: number
  ): Promise<AIResponse> {
    const endpoint = `${this.getBaseUrl()}/models/${actualModel}:generateContent?key=${this.config.apiKey}`;
    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: 3000 },
    };
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || '')
      .join('') || '';

    return {
      content,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      model: actualModel,
      duration: Date.now() - startTime,
    };
  }

  private getBaseUrl(): string {
    switch (this.config.provider) {
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'google':
        // v1beta exposes gemini-1.5 / 2.0 flash & pro
        return 'https://generativelanguage.googleapis.com/v1beta';
      case 'zhipu':
        // 智谱 GLM 开放平台 — OpenAI 兼容
        return 'https://open.bigmodel.cn/api/paas/v4';
      default:
        return this.config.baseUrl || 'https://api.openai.com/v1';
    }
  }
}

export function createAIClient(): AIClient {
  // Priority: ZHIPU_API_KEY > GEMINI_API_KEY > OPENROUTER_API_KEY > OPENAI_API_KEY > ANTHROPIC_API_KEY
  // If ZHIPU_API_KEY is present we default to zhipu provider unless MODEL_PROVIDER
  // explicitly overrides it (zhipu works in China without VPN).
  const explicitProvider = process.env.MODEL_PROVIDER;
  const zhipuKey = process.env.ZHIPU_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let provider: string;
  let apiKey: string;

  if (explicitProvider === 'zhipu' && zhipuKey) {
    provider = 'zhipu';
    apiKey = zhipuKey;
  } else if (explicitProvider === 'google' && geminiKey) {
    provider = 'google';
    apiKey = geminiKey;
  } else if (zhipuKey && !explicitProvider) {
    provider = 'zhipu';
    apiKey = zhipuKey;
  } else if (geminiKey && !explicitProvider) {
    provider = 'google';
    apiKey = geminiKey;
  } else if (explicitProvider) {
    provider = explicitProvider;
    apiKey = zhipuKey || openRouterKey || openAiKey || anthropicKey || geminiKey || '';
  } else {
    provider = 'zhipu';
    apiKey = zhipuKey || openRouterKey || openAiKey || anthropicKey || geminiKey || '';
  }

  return new AIClient({ provider, apiKey });
}
