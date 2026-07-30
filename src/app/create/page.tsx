'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Camera,
  X,
  RefreshCw,
  Save,
  Share2,
} from 'lucide-react';
import { POEM_STYLES } from '@/lib/constants';

interface Photo {
  id: string;
  url: string;
}

interface Meaning {
  coreMeaning?: string;
  emotions?: string[];
  imagery?: string[];
  themes?: string[];
}

export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('UPLOADING');
  const [meaning, setMeaning] = useState<Meaning | null>(null);
  const [meaningEdit, setMeaningEdit] = useState(false);
  const [poem, setPoem] = useState<string>('');
  const [style, setStyle] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      setPhotos((prev) => [...prev, ...data.photos]);
    } catch (err) {
      setError('照片上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const startCreation = async () => {
    if (photos.length === 0) {
      setError('请先上传至少一张照片');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create creative session
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: photos.map((p) => p.id),
          mode: 'FREE',
        }),
      });

      if (!sessionResponse.ok) {
        let msg = '创建创作会话失败';
        try {
          const d = await sessionResponse.json();
          if (d && d.error) msg = d.error;
        } catch {}
        throw new Error(msg);
      }

      const sessionData = await sessionResponse.json();
      setSessionId(sessionData.id);
      setStatus('ANALYZING');

      // Step 2: Poll session status while generating (so progress advances)
      let pollStop = false;
      const pollStatus = async () => {
        while (!pollStop) {
          try {
            // Wait first, then poll to give backend a head start
            await new Promise((r) => setTimeout(r, 1500));
            if (pollStop) break;
            const s = await fetch(`/api/sessions?id=${sessionData.id}`);
            if (!s.ok) continue;
            const list = await s.json();
            const current = Array.isArray(list)
              ? list.find((x: any) => x.id === sessionData.id)
              : (list as any)?.id === sessionData.id ? list : null;
            if (current && current.status) setStatus(current.status);
          } catch {}
        }
      };
      const pollPromise = pollStatus();

      // Step 3: Generate poem (may take several seconds)
      let generateData: any = null;
      try {
        const generateResponse = await fetch('/api/poems/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionData.id,
            style,
          }),
        });

        if (!generateResponse.ok) {
          let msg = '诗歌生成失败';
          try {
            const d = await generateResponse.json();
            if (d && d.error) msg = d.error;
          } catch {}
          throw new Error(msg);
        }
        generateData = await generateResponse.json();
      } finally {
        pollStop = true;
        try { await pollPromise; } catch {}
      }

      setMeaning(generateData.meaning);
      setPoem(generateData.poem.content);
      setStatus('COMPLETED');
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || '创作过程中发生错误');
      setStatus('FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId) return;
    router.push('/poems');
  };

  const reset = () => {
    setPhotos([]);
    setSessionId(null);
    setStatus('UPLOADING');
    setMeaning(null);
    setPoem('');
    setCompleted(false);
    setError('');
  };

  if (false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-400" />
      </div>
    );
  }

  const statusSteps = [
    { key: 'UPLOADING', label: '上传照片', icon: Camera },
    { key: 'ANALYZING', label: 'AI分析', icon: Sparkles },
    { key: 'MEANING_EXTRACTING', label: '意义提取', icon: ImageIcon },
    { key: 'WRITING', label: '诗歌创作', icon: Sparkles },
    { key: 'COMPLETED', label: '完成', icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink-900">创作新诗</h1>
        <p className="mt-2 text-ink-600">
          上传照片，让AI为你捕捉瞬间的意义
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-12">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {statusSteps.map((step, idx) => {
            const isActive = status === step.key;
            const isCompleted = statusSteps.findIndex(s => s.key === status) > idx;
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex flex-col items-center ${
                    isActive || isCompleted ? 'text-ink-800' : 'text-ink-400'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      isActive
                        ? 'border-ink-800 bg-ink-800 text-parchment-50 animate-pulse'
                        : isCompleted
                        ? 'border-ink-600 bg-ink-600 text-parchment-50'
                        : 'border-ink-300 bg-white'
                    }`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className="mt-2 text-xs font-medium hidden sm:block">
                    {step.label}
                  </span>
                </div>
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`h-0.5 w-4 sm:w-8 ${
                      isCompleted ? 'bg-ink-600' : 'bg-ink-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Section */}
      {!completed && (
        <div className="card p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              photos.length > 0
                ? 'border-ink-300 bg-parchment-50'
                : 'border-ink-300 hover:border-ink-400 hover:bg-parchment-50/50 cursor-pointer'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploading ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-ink-400" />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-ink-400" />
            )}
            <p className="mt-4 text-lg font-medium text-ink-700">
              {uploading ? '上传中...' : '点击或拖拽照片到此处'}
            </p>
            <p className="mt-2 text-sm text-ink-500">
              支持 JPG、PNG、WebP 格式，最多10MB
            </p>
          </div>

          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-4 text-sm font-medium text-ink-700">
                已选择 {photos.length} 张照片
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.url}
                      alt="预览"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Style Selection */}
          {photos.length > 0 && (
            <div className="mt-8">
              <label className="label">选择诗风格</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {POEM_STYLES.map((styleOption) => (
                  <button
                    key={styleOption.value}
                    onClick={() => setStyle(styleOption.value)}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      style === styleOption.value
                        ? 'border-ink-800 bg-ink-800 text-parchment-50'
                        : 'border-ink-200 hover:border-ink-400'
                    }`}
                  >
                    <p className="text-sm font-medium">{styleOption.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          {photos.length > 0 && !loading && (
            <div className="mt-8 text-center">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <button
                onClick={startCreation}
                className="btn-primary text-base px-8 py-4"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                开始诗意创作
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}

          {loading && (
            <div className="mt-8 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-ink-600" />
              <p className="mt-4 text-lg font-medium text-ink-700">
                {status === 'ANALYZING' && 'AI正在分析照片...'}
                {status === 'MEANING_EXTRACTING' && '正在提取意义...'}
                {status === 'WRITING' && '正在创作诗歌...'}
                {status === 'REVIEWING' && '正在审阅润色...'}
                {!status && '正在处理中...'}
              </p>
              <p className="mt-2 text-sm text-ink-500">
                这可能需要几秒钟，请耐心等待
              </p>
            </div>
          )}
        </div>
      )}

      {/* Result Section */}
      {completed && (
        <div className="space-y-8">
          {/* Meaning Card */}
          {meaning && (
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-800">捕捉的意义</h3>
                <button
                  onClick={() => setMeaningEdit(!meaningEdit)}
                  className="btn-ghost text-sm"
                >
                  {meaningEdit ? '完成编辑' : '编辑'}
                </button>
              </div>
              {meaningEdit ? (
                <textarea
                  className="textarea"
                  value={JSON.stringify(meaning, null, 2)}
                  onChange={(e) => {
                    try {
                      setMeaning(JSON.parse(e.target.value));
                    } catch {}
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {meaning.coreMeaning && (
                    <div>
                      <span className="text-sm font-medium text-ink-500">核心意义</span>
                      <p className="mt-1 text-lg font-medium text-ink-800">
                        {meaning.coreMeaning}
                      </p>
                    </div>
                  )}
                  {meaning.emotions && meaning.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {meaning.emotions.map((emotion, idx) => (
                        <span key={idx} className="badge">
                          {emotion}
                        </span>
                      ))}
                    </div>
                  )}
                  {meaning.imagery && meaning.imagery.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {meaning.imagery.map((img, idx) => (
                        <span key={idx} className="badge-ink">
                          {img}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Poem Display */}
          <div className="card p-8 sm:p-12 text-center">
            <div className="mb-6 flex items-center justify-center gap-2 text-ink-500">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm">AI创作 · {POEM_STYLES.find(s => s.value === style)?.label}</span>
            </div>
            <div className="poem-text text-xl sm:text-2xl animate-fade-in">
              {poem.split('\n').map((line, idx) => (
                <p key={idx} className={line.trim() ? 'mb-2' : 'h-2'}>
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button onClick={reset} className="btn-secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              再创作一首
            </button>
            <button onClick={handleSave} className="btn-primary">
              <Save className="mr-2 h-4 w-4" />
              保存诗歌
            </button>
            <button className="btn-secondary">
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
