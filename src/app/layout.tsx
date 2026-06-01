import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import PWARegister from '@/components/utils/PWARegister';

export const metadata: Metadata = {
  title: '샘깊은교회 장소 예약',
  description: '샘깊은교회 장소 예약 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '문사방',
    startupImage: [
      {
        url: '/pwa/apple-splash-1320-2868.png',
        media:
          'screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/pwa/apple-splash-1206-2622.png',
        media:
          'screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/pwa/apple-splash-1290-2796.png',
        media:
          'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/pwa/apple-splash-1179-2556.png',
        media:
          'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/pwa/apple-splash-1284-2778.png',
        media:
          'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/pwa/apple-splash-1170-2532.png',
        media:
          'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/pwa/apple-splash-1125-2436.png',
        media: 'screen and (device-width: 375px)',
      },
      {
        url: '/pwa/apple-splash-750-1334.png',
        media: 'screen and (device-width: 375px)',
      },
    ],
  },
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
