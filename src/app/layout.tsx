import type { Metadata } from 'next';
import './globals.css';
import { APP_CONFIG } from '@/lib/constants';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: `${APP_CONFIG.chineseName} - ${APP_CONFIG.tagline}`,
    template: `%s | ${APP_CONFIG.chineseName}`,
  },
  description: APP_CONFIG.description,
  keywords: ['诗歌', 'AI创作', '照片生诗', '诗意生活', 'PoeticRealm'],
  authors: [{ name: APP_CONFIG.chineseName }],
  openGraph: {
    type: 'website',
    title: APP_CONFIG.chineseName,
    description: APP_CONFIG.description,
    siteName: APP_CONFIG.chineseName,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@300;400;500;600;700&family=Ma+Shan+Zheng&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-parchment-50 font-body text-ink-800 antialiased">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
