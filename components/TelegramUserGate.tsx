'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrencyByCountry } from '@/lib/currencyUtils';

// Маппинг языков на коды стран (упрощённый, можно расширить)
const languageToCountry: Record<string, string> = {
  ru: 'RU',
  en: 'US',
  uk: 'UA',
  de: 'DE',
  fr: 'FR',
  it: 'IT',
  es: 'ES',
  pt: 'PT',
  pl: 'PL',
  cs: 'CZ',
  tr: 'TR',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
  ar: 'AE',
  he: 'IL',
};

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
      const userData = tg.initDataUnsafe.user;
      
      // Сохраняем id в глобальную область, чтобы переиспользовать в других компонентах
      (window as any).__telegramUserId = telegramUserId;

      // Вызываем RPC для установки пользователя (если есть такая функция)
      const { error: rpcError } = await supabase.rpc('set_telegram_user', {
        telegram_user_id: telegramUserId,
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        // Продолжаем даже при ошибке RPC
      }

      // Проверяем, есть ли пользователь в таблице users
      const { data: existingUser } = await supabase
        .from('users')
        .select('telegram_user_id')
        .eq('telegram_user_id', telegramUserId)
        .single();

      // Если пользователя нет, создаём его с данными из Telegram
      if (!existingUser) {
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            telegram_user_id: telegramUserId,
            username: userData.username || null,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            language_code: userData.language_code || null,
            is_bot: userData.is_bot || false,
          });

        if (userError) {
          console.error('Error creating user:', userError);
        }
      } else {
        // Если пользователь существует, обновляем его данные (на случай изменения username и т.д.)
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: userData.username || null,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            language_code: userData.language_code || null,
          })
          .eq('telegram_user_id', telegramUserId);

        if (updateError) {
          console.error('Error updating user:', updateError);
        }
      }

      // Получаем страну из Telegram (если доступна)
      // Telegram может предоставлять country_code в некоторых случаях
      // Если нет, используем language_code как приблизительный индикатор
      let countryCode: string | null = null;
      
      // Пытаемся получить country_code напрямую (если доступен)
      if (tg.initDataUnsafe?.user?.language_code) {
        const langCode = tg.initDataUnsafe.user.language_code.split('-')[0].toLowerCase();
        countryCode = languageToCountry[langCode] || null;
      }

      // Определяем валюту по стране
      const currency = getCurrencyByCountry(countryCode);

      // Проверяем, есть ли уже настройки пользователя
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('telegram_user_id')
        .eq('telegram_user_id', telegramUserId)
        .single();

      // Если настроек нет, создаём их с данными из Telegram
      if (!existingSettings) {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            telegram_user_id: telegramUserId,
            country: countryCode,
            currency: currency,
          });

        if (settingsError) {
          console.error('Error saving user settings:', settingsError);
        }
      }

      // Создаём запись баланса, если её нет
      const { data: existingBalance } = await supabase
        .from('user_balance')
        .select('telegram_user_id')
        .eq('telegram_user_id', telegramUserId)
        .single();

      if (!existingBalance) {
        const { error: balanceError } = await supabase
          .from('user_balance')
          .upsert({
            telegram_user_id: telegramUserId,
            balance: 0.00,
          });

        if (balanceError) {
          console.error('Error creating user balance:', balanceError);
        }
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

