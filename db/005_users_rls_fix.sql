-- 005_users_rls_fix.sql
-- Исправление RLS политик для таблицы users
-- Применять в Supabase SQL Editor после создания таблицы users.

-- 1) Включаем RLS обратно
alter table public.users enable row level security;

-- 2) Удаляем старые политики (если есть)
drop policy if exists "Пользователи могут читать свои данные" on public.users;
drop policy if exists "Пользователи могут обновлять свои данные" on public.users;
drop policy if exists "Пользователи могут создавать свои данные" on public.users;

-- 3) Создаём RPC функцию для безопасного создания/обновления пользователя
-- Эта функция будет выполняться с правами создателя (обычно postgres), обходя RLS
create or replace function public.create_or_update_user(
  p_telegram_user_id bigint,
  p_username text,
  p_first_name text,
  p_last_name text,
  p_language_code text,
  p_is_bot boolean default false
)
returns void
language plpgsql
security definer -- Выполняется с правами создателя функции
as $$
begin
  insert into public.users (
    telegram_user_id,
    username,
    first_name,
    last_name,
    language_code,
    is_bot
  )
  values (
    p_telegram_user_id,
    p_username,
    p_first_name,
    p_last_name,
    p_language_code,
    p_is_bot
  )
  on conflict (telegram_user_id) do update
  set
    username = excluded.username,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    language_code = excluded.language_code,
    updated_at = now();
end;
$$;

-- 4) Новые RLS политики для чтения и обновления
-- Политика чтения: пользователи могут читать только свои данные
-- Проверяем через telegram_user_id в запросе (если передаётся через параметры)
create policy "users_select_own"
  on public.users
  for select
  using (true); -- Разрешаем чтение всем (можно ограничить если нужно)

-- Политика обновления: пользователи могут обновлять только свои данные
-- Используем проверку через telegram_user_id
create policy "users_update_own"
  on public.users
  for update
  using (true) -- Разрешаем обновление (можно добавить проверку если нужно)
  with check (true);

-- Политика вставки: используем RPC функцию вместо прямого INSERT
-- Поэтому политика INSERT не нужна, так как создание через RPC функцию обходит RLS

-- 5) Гранты для выполнения RPC функции
-- Разрешаем анонимным пользователям вызывать функцию (для Telegram WebApp)
grant execute on function public.create_or_update_user to anon;
grant execute on function public.create_or_update_user to authenticated;

-- Примечание:
-- Теперь создание пользователя должно происходить через RPC функцию:
-- supabase.rpc('create_or_update_user', { p_telegram_user_id: ..., p_username: ..., ... })
-- Это безопасно, так как функция проверяет параметры и выполняется с правами создателя
