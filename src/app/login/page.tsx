'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Github, Chrome, Mail, ArrowRight } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = searchParams.get('register') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (register) {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!regRes.ok) {
          const regData = await regRes.json();
          setError(regData.error || '注册失败');
          setLoading(false);
          return;
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(register ? '注册成功但自动登录失败，请手动登录' : '登录失败，请检查邮箱和密码');
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError(register ? '注册过程中发生错误' : '登录过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="card p-8 sm:p-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-ink-900">
              {register ? '创建账户' : '欢迎回来'}
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              {register
                ? '开始你的诗意创作之旅'
                : '登录以继续你的创作'}
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="mt-8 space-y-3">
            <button
              onClick={() => handleOAuthSignIn('google')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition-all hover:border-ink-300 hover:bg-parchment-50"
            >
              <Chrome className="h-5 w-5 text-red-500" />
              使用 Google 账号
            </button>
            <button
              onClick={() => handleOAuthSignIn('github')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition-all hover:border-ink-300 hover:bg-parchment-50"
            >
              <Github className="h-5 w-5" />
              使用 GitHub 账号
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-parchment-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-parchment-50 px-4 text-ink-500">或使用邮箱</span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? '处理中...' : register ? '创建账户' : '登录'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-ink-500">
            {register ? (
              <p>
                已有账户？{' '}
                <Link href="/login" className="font-medium text-ink-700 hover:underline">
                  立即登录
                </Link>
              </p>
            ) : (
              <p>
                还没有账户？{' '}
                <Link href="/login?register=true" className="font-medium text-ink-700 hover:underline">
                  创建账户
                </Link>
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          继续使用即表示你同意我们的
          <Link href="/terms" className="underline mx-1">服务条款</Link>
          和
          <Link href="/privacy" className="underline mx-1">隐私政策</Link>
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-ink-500">加载中...</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
