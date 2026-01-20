-- 004_users_table.sql
-- Таблица пользователей (users)
-- Применять в Supabase SQL Editor.

-- 1) Таблица users
create table if not exists public.users (
  telegram_user_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_bot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists username text;
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;
alter table public.users add column if not exists language_code text;
alter table public.users add column if not exists is_bot boolean;

-- 2) Индексы
create index if not exists users_username_idx on public.users(username);
create index if not exists users_created_at_idx on public.users(created_at);

-- 3) Триггер для автоматического обновления updated_at
drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function update_updated_at_column();

-- 4) RLS политики для users
alter table public.users enable row level security;

create policy "Пользователи могут читать свои данные"
  on public.users
  for select
  using (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

create policy "Пользователи могут обновлять свои данные"
  on public.users
  for update
  using (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  )
  with check (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

create policy "Пользователи могут создавать свои данные"
  on public.users
  for insert
  with check (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

-- Примечание: RLS политики используют JWT claims, которые должны быть установлены через RPC функцию set_telegram_user
-- Если у тебя нет такой функции или RLS блокирует создание, можно временно отключить RLS для INSERT:
-- alter table public.users disable row level security;
-- или использовать более простые политики без проверки JWT
