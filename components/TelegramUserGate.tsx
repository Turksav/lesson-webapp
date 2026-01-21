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
      // Функция для ожидания загрузки Telegram WebApp
      const waitForTelegram = (): Promise<any> => {
        return new Promise((resolve) => {
          // Проверяем сразу
          if ((window as any).Telegram?.WebApp) {
            resolve((window as any).Telegram.WebApp);
            return;
          }

          // Если не найдено, ждём до 3 секунд
          let attempts = 0;
          const maxAttempts = 30; // 30 попыток по 100мс = 3 секунды
          
          const checkInterval = setInterval(() => {
            attempts++;
            const tg = (window as any).Telegram?.WebApp;
            
            if (tg) {
              clearInterval(checkInterval);
              resolve(tg);
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 100);
        });
      };

      const tg = await waitForTelegram();
      
      // Логирование для диагностики
      console.log('Telegram WebApp check:', {
        hasTelegram: !!(window as any).Telegram,
        hasWebApp: !!(window as any).Telegram?.WebApp,
        tg: tg ? 'found' : 'not found',
        userAgent: navigator.userAgent,
      });

      // Если не в Telegram WebApp – просто продолжаем без привязки к пользователю
      if (!tg) {
        console.warn('Telegram WebApp not detected after waiting, skipping Telegram init');
        console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('telegram')));
        setReady(true);
        return;
      }

      // Логируем данные Telegram для диагностики
      console.log('Telegram WebApp data:', {
        initDataUnsafe: tg.initDataUnsafe,
        user: tg.initDataUnsafe?.user,
        version: tg.version,
        platform: tg.platform,
      });

      if (!tg.initDataUnsafe?.user?.id) {
        console.warn('Telegram user not found in initData, skipping Supabase RPC');
        console.log('Available initDataUnsafe keys:', tg.initDataUnsafe ? Object.keys(tg.initDataUnsafe) : 'null');
        setReady(true);
        return;
      }

      const telegramUserId = tg.initDataUnsafe.user.id;
      const userData = tg.initDataUnsafe.user;
      
      console.log('Processing Telegram user:', {
        id: telegramUserId,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        language_code: userData.language_code,
      });
      
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

      // Создаём или обновляем пользователя через RPC функцию (обходит RLS безопасно)
      console.log('Creating/updating user in database via RPC...');
      const { error: userError } = await supabase.rpc('create_or_update_user', {
        p_telegram_user_id: telegramUserId,
        p_username: userData.username || null,
        p_first_name: userData.first_name || null,
        p_last_name: userData.last_name || null,
        p_language_code: userData.language_code || null,
        p_is_bot: userData.is_bot || false,
      });

      if (userError) {
        console.error('Error creating/updating user via RPC:', userError);
        console.error('Error details:', JSON.stringify(userError, null, 2));
        
        // Fallback: пытаемся через прямой upsert (если RPC не работает)
        console.log('Trying fallback: direct upsert...');
        const { error: fallbackError } = await supabase
          .from('users')
          .upsert({
            telegram_user_id: telegramUserId,
            username: userData.username || null,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            language_code: userData.language_code || null,
            is_bot: userData.is_bot || false,
          });

        if (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        } else {
          console.log('User created/updated via fallback');
        }
      } else {
        console.log('User created/updated successfully via RPC');
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

      // Создаём или обновляем настройки пользователя через RPC функцию
      console.log('Creating/updating user settings via RPC...');
      const { error: settingsError } = await supabase.rpc('create_or_update_user_settings', {
        p_telegram_user_id: telegramUserId,
        p_country: countryCode,
        p_currency: currency,
      });

      if (settingsError) {
        console.error('Error creating/updating user settings via RPC:', settingsError);
        console.error('Error details:', JSON.stringify(settingsError, null, 2));
        
        // Fallback: пытаемся через прямой upsert (если RPC не работает)
        console.log('Trying fallback: direct upsert for settings...');
        const { error: fallbackError } = await supabase
          .from('user_settings')
          .upsert({
            telegram_user_id: telegramUserId,
            country: countryCode,
            currency: currency,
          });

        if (fallbackError) {
          console.error('Fallback also failed for settings:', fallbackError);
        } else {
          console.log('User settings created/updated via fallback');
        }
      } else {
        console.log('User settings created/updated successfully via RPC');
      }

      // Создаём или обновляем баланс пользователя через RPC функцию
      console.log('Creating/updating user balance via RPC...');
      const { error: balanceError } = await supabase.rpc('create_or_update_user_balance', {
        p_telegram_user_id: telegramUserId,
        p_balance: 0.00,
      });

      if (balanceError) {
        console.error('Error creating/updating user balance via RPC:', balanceError);
        console.error('Error details:', JSON.stringify(balanceError, null, 2));
        
        // Fallback: пытаемся через прямой upsert (если RPC не работает)
        console.log('Trying fallback: direct upsert for balance...');
        const { error: fallbackError } = await supabase
          .from('user_balance')
          .upsert({
            telegram_user_id: telegramUserId,
            balance: 0.00,
          });

        if (fallbackError) {
          console.error('Fallback also failed for balance:', fallbackError);
        } else {
          console.log('User balance created/updated via fallback');
        }
      } else {
        console.log('User balance created/updated successfully via RPC');
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

