import type { ReactNode } from 'react';
import Script from 'next/script';
import TelegramUserGate from '@/components/TelegramUserGate';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning>
        <TelegramUserGate>{children}</TelegramUserGate>
      </body>
    </html>
  );
}
