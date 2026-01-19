'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const tg = (window as any)?.Telegram?.WebApp;
      if (!tg?.initDataUnsafe?.user?.id) {
        console.error('Telegram user not found');
        return;
      }

      const telegramUserId = tg.initDataUnsafe.user.id;

      const { error } = await supabase.rpc('set_telegram_user', {
        telegram_user_id: telegramUserId,
      });

      if (error) {
        console.error(error);
        return;
      }

      setReady(true);
    };

    init();
  }, []);

  if (!ready) {
    return <html><body>Загрузка…</body></html>;
  }

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
