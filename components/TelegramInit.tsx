'use client';

import { useEffect } from 'react';

export default function TelegramInit() {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    console.log('Telegram user:', tg.initDataUnsafe?.user);
  }, []);

  return null;
}
