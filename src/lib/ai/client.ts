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

export class AIClient {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async analyzeImage(
    imageUrl: string,
    prompt: string,
    model?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const actualModel = model || process.env.VISION_MODEL || 'gpt-4o-vision';

    try {
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
    } catch (error) {
      console.error('AI analyzeImage error:', error);
      throw error;
    }
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    model?: string,
    temperature: number = 0.8
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const actualModel = model || process.env.WRITER_MODEL || 'gpt-4o';

    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
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
    } catch (error) {
      console.error('AI generateText error:', error);
      throw error;
    }
  }

  private getBaseUrl(): string {
    switch (this.config.provider) {
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'google':
        return 'https://generativelanguage.googleapis.com/v1';
      default:
        return this.config.baseUrl || 'https://api.openai.com/v1';
    }
  }
}

export function createAIClient(): AIClient {
  const provider = process.env.MODEL_PROVIDER || 'openrouter';
  const apiKey = 
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';

  return new AIClient({
    provider,
    apiKey,
  });
}
