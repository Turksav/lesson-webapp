'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export default function TelegramUserGate({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const tg = (window as any)?.Telegram?.WebApp;
      // Если не в Telegram WebApp – просто продолжаем без привязки к пользователю
      if (!tg) {
        console.warn('Telegram WebApp not detected, skipping Telegram init');
        setReady(true);
        return;
      }

      if (!tg.initDataUnsafe?.user?.id) {
        console.warn('Telegram user not found in initData, skipping Supabase RPC');
        setReady(true);
        return;
      }

      const telegramUserId = tg.initDataUnsafe.user.id;
      // Сохраняем id в глобальную область, чтобы переиспользовать в других компонентах
      (window as any).__telegramUserId = telegramUserId;

      const { error } = await supabase.rpc('set_telegram_user', {
        telegram_user_id: telegramUserId,
      });

      if (error) {
        console.error(error);
        // Даже при ошибке Supabase не блокируем UI
        setReady(true);
        return;
      }

      setReady(true);
    };

    init();
  }, []);

  if (!ready) {
    return <div>Загрузка…</div>;
  }

  return <>{children}</>;
}

