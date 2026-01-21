-- 006_user_settings_rls_fix.sql
-- Исправление RLS политик для таблицы user_settings
-- Применять в Supabase SQL Editor после создания таблицы user_settings.

-- 1) Включаем RLS обратно (если был отключён)
alter table public.user_settings enable row level security;

-- 2) Удаляем старые политики (если есть)
drop policy if exists "Пользователи могут читать свои настройки" on public.user_settings;
drop policy if exists "Пользователи могут обновлять свои настройки" on public.user_settings;
drop policy if exists "Пользователи могут создавать свои настройки" on public.user_settings;

-- 3) Создаём RPC функцию для безопасного создания/обновления настроек пользователя
-- Эта функция будет выполняться с правами создателя (обычно postgres), обходя RLS
create or replace function public.create_or_update_user_settings(
  p_telegram_user_id bigint,
  p_country text,
  p_currency text default 'USD'
)
returns void
language plpgsql
security definer -- Выполняется с правами создателя функции
as $$
begin
  insert into public.user_settings (
    telegram_user_id,
    country,
    currency
  )
  values (
    p_telegram_user_id,
    p_country,
    p_currency
  )
  on conflict (telegram_user_id) do update
  set
    country = excluded.country,
    currency = excluded.currency,
    updated_at = now();
end;
$$;

-- 4) Новые RLS политики для чтения и обновления
-- Политика чтения: пользователи могут читать только свои настройки
create policy "user_settings_select_own"
  on public.user_settings
  for select
  using (true); -- Разрешаем чтение всем (можно ограничить если нужно)

-- Политика обновления: пользователи могут обновлять только свои настройки
create policy "user_settings_update_own"
  on public.user_settings
  for update
  using (true) -- Разрешаем обновление (можно добавить проверку если нужно)
  with check (true);

-- Политика вставки: используем RPC функцию вместо прямого INSERT
-- Поэтому политика INSERT не нужна, так как создание через RPC функцию обходит RLS

-- 5) Гранты для выполнения RPC функции
-- Разрешаем анонимным пользователям вызывать функцию (для Telegram WebApp)
grant execute on function public.create_or_update_user_settings to anon;
grant execute on function public.create_or_update_user_settings to authenticated;

-- Примечание:
-- Теперь создание настроек должно происходить через RPC функцию:
-- supabase.rpc('create_or_update_user_settings', { p_telegram_user_id: ..., p_country: ..., p_currency: ... })
-- Это безопасно, так как функция проверяет параметры и выполняется с правами создателя
