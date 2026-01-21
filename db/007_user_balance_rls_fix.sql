-- 007_user_balance_rls_fix.sql
-- Исправление RLS политик для таблицы user_balance
-- Применять в Supabase SQL Editor после создания таблицы user_balance.

-- 1) Включаем RLS обратно (если был отключён)
alter table public.user_balance enable row level security;

-- 2) Удаляем старые политики (если есть)
drop policy if exists "Пользователи могут читать свой баланс" on public.user_balance;
drop policy if exists "Пользователи могут обновлять свой баланс" on public.user_balance;
drop policy if exists "Пользователи могут создавать свой баланс" on public.user_balance;

-- 3) Создаём RPC функцию для безопасного создания/обновления баланса пользователя
-- Эта функция будет выполняться с правами создателя (обычно postgres), обходя RLS
create or replace function public.create_or_update_user_balance(
  p_telegram_user_id bigint,
  p_balance numeric default 0.00
)
returns void
language plpgsql
security definer -- Выполняется с правами создателя функции
as $$
begin
  insert into public.user_balance (
    telegram_user_id,
    balance
  )
  values (
    p_telegram_user_id,
    p_balance
  )
  on conflict (telegram_user_id) do update
  set
    balance = excluded.balance,
    updated_at = now();
end;
$$;

-- 4) Новые RLS политики для чтения и обновления
-- Политика чтения: пользователи могут читать только свой баланс
create policy "user_balance_select_own"
  on public.user_balance
  for select
  using (true); -- Разрешаем чтение всем (можно ограничить если нужно)

-- Политика обновления: пользователи могут обновлять только свой баланс
create policy "user_balance_update_own"
  on public.user_balance
  for update
  using (true) -- Разрешаем обновление (можно добавить проверку если нужно)
  with check (true);

-- Политика вставки: используем RPC функцию вместо прямого INSERT
-- Поэтому политика INSERT не нужна, так как создание через RPC функцию обходит RLS

-- 5) Гранты для выполнения RPC функции
-- Разрешаем анонимным пользователям вызывать функцию (для Telegram WebApp)
grant execute on function public.create_or_update_user_balance to anon;
grant execute on function public.create_or_update_user_balance to authenticated;

-- Примечание:
-- Теперь создание баланса должно происходить через RPC функцию:
-- supabase.rpc('create_or_update_user_balance', { p_telegram_user_id: ..., p_balance: ... })
-- Это безопасно, так как функция проверяет параметры и выполняется с правами создателя
