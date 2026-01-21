-- 009_user_balance_create_only.sql
-- Исправление RPC функции для создания баланса только если его нет
-- Применять в Supabase SQL Editor.

-- Создаём новую RPC функцию только для создания баланса (без обновления)
create or replace function public.create_user_balance_if_not_exists(
  p_telegram_user_id bigint,
  p_balance numeric default 0.00
)
returns void
language plpgsql
security definer
as $$
begin
  -- Вставляем только если записи нет
  insert into public.user_balance (
    telegram_user_id,
    balance
  )
  values (
    p_telegram_user_id,
    p_balance
  )
  on conflict (telegram_user_id) do nothing; -- Не обновляем, если уже существует
end;
$$;

-- Гранты для выполнения новой функции
grant execute on function public.create_user_balance_if_not_exists to anon;
grant execute on function public.create_user_balance_if_not_exists to authenticated;

-- Примечание:
-- Старая функция create_or_update_user_balance остаётся для случаев, когда нужно обновить баланс
-- Новая функция create_user_balance_if_not_exists используется только для создания нового баланса
