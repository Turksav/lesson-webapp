-- 003_user_settings_balance.sql
-- Настройки пользователя и баланс
-- Применять в Supabase SQL Editor.

-- 1) Настройки пользователя
create table if not exists public.user_settings (
  telegram_user_id bigint primary key,
  country text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Баланс пользователя
create table if not exists public.user_balance (
  telegram_user_id bigint primary key,
  balance numeric(12, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Индексы
create index if not exists user_settings_country_idx on public.user_settings(country);
create index if not exists user_settings_currency_idx on public.user_settings(currency);

-- 4) Функция для автоматического обновления updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Триггеры для автоматического обновления updated_at
drop trigger if exists update_user_settings_updated_at on public.user_settings;
create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_user_balance_updated_at on public.user_balance;
create trigger update_user_balance_updated_at
  before update on public.user_balance
  for each row
  execute function update_updated_at_column();

-- 5) RLS политики для user_settings
alter table public.user_settings enable row level security;

create policy "Пользователи могут читать свои настройки"
  on public.user_settings
  for select
  using (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

create policy "Пользователи могут обновлять свои настройки"
  on public.user_settings
  for update
  using (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  )
  with check (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

create policy "Пользователи могут создавать свои настройки"
  on public.user_settings
  for insert
  with check (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

-- 6) RLS политики для user_balance
alter table public.user_balance enable row level security;

create policy "Пользователи могут читать свой баланс"
  on public.user_balance
  for select
  using (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

create policy "Пользователи могут обновлять свой баланс"
  on public.user_balance
  for update
  using (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  )
  with check (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

create policy "Пользователи могут создавать свой баланс"
  on public.user_balance
  for insert
  with check (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
  );

-- Примечание: RLS политики используют JWT claims, которые должны быть установлены через RPC функцию set_telegram_user
-- Если у тебя нет такой функции, можно временно отключить RLS или использовать более простые политики
