-- 012_auto_confirm_consultations.sql
-- Обновление функции create_consultation для автоматического подтверждения консультаций
-- Применять в Supabase SQL Editor.

-- Обновляем RPC функцию для создания консультации с автоматическим подтверждением
create or replace function public.create_consultation(
  p_telegram_user_id bigint,
  p_format text,
  p_consultation_date date,
  p_consultation_time time,
  p_quantity int,
  p_price numeric,
  p_currency text,
  p_comment text default null
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_consultation_id bigint;
  v_user_balance numeric;
  v_required_balance numeric;
begin
  -- Проверяем баланс пользователя
  select balance into v_user_balance
  from public.user_balance
  where telegram_user_id = p_telegram_user_id;

  if v_user_balance is null then
    raise exception 'Баланс пользователя не найден';
  end if;

  v_required_balance := p_price * p_quantity;

  if v_user_balance < v_required_balance then
    raise exception 'Недостаточно средств на балансе. Требуется: % %, доступно: % %', 
      v_required_balance, p_currency, v_user_balance, p_currency;
  end if;

  -- Создаём запись консультации со статусом 'confirmed' (автоматическое подтверждение)
  insert into public.consultations (
    telegram_user_id,
    format,
    consultation_date,
    consultation_time,
    quantity,
    price,
    currency,
    comment,
    status
  )
  values (
    p_telegram_user_id,
    p_format,
    p_consultation_date,
    p_consultation_time,
    p_quantity,
    p_price,
    p_currency,
    p_comment,
    'confirmed'  -- Автоматическое подтверждение вместо 'pending'
  )
  returning id into v_consultation_id;

  -- Списываем средства с баланса
  update public.user_balance
  set balance = balance - v_required_balance,
      updated_at = now()
  where telegram_user_id = p_telegram_user_id;

  return v_consultation_id;
end;
$$;

-- Примечание:
-- Теперь все создаваемые консультации будут автоматически получать статус 'confirmed'
-- вместо 'pending', что означает автоматическое подтверждение при создании
