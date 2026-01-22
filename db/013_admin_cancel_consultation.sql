-- 013_admin_cancel_consultation.sql
-- RPC функция для отмены консультации администратором
-- Применять в Supabase SQL Editor.

-- RPC функция для отмены консультации администратором (без проверки 24 часов)
create or replace function public.admin_cancel_consultation(
  p_consultation_id bigint
)
returns void
language plpgsql
security definer
as $$
declare
  v_consultation record;
begin
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  if auth.uid() is null then
    raise exception 'Требуется аутентификация';
  end if;

  -- Получаем данные консультации
  select * into v_consultation
  from public.consultations
  where id = p_consultation_id;

  if not found then
    raise exception 'Консультация не найдена';
  end if;

  if v_consultation.status = 'cancelled' then
    raise exception 'Консультация уже отменена';
  end if;

  if v_consultation.status = 'completed' then
    raise exception 'Нельзя отменить завершённую консультацию';
  end if;

  -- Возвращаем средства на баланс
  update public.user_balance
  set balance = balance + (v_consultation.price * v_consultation.quantity),
      updated_at = now()
  where telegram_user_id = v_consultation.telegram_user_id;

  -- Отменяем консультацию
  update public.consultations
  set status = 'cancelled',
      updated_at = now()
  where id = p_consultation_id;
end;
$$;

-- Гранты для выполнения RPC функции
grant execute on function public.admin_cancel_consultation to authenticated;

-- Примечание:
-- Эта функция позволяет администратору отменять любую консультацию без проверки 24 часов
-- Средства автоматически возвращаются на баланс клиента
