import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import PWARegister from '@/components/utils/PWARegister';

export const metadata: Metadata = {
  title: '샘깊은교회 장소 예약',
  description: '샘깊은교회 장소 예약 서비스',
  manifest: '/manifest.json',
  colorScheme: 'light',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <PWARegister />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
