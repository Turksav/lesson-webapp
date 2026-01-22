-- 014_admin_delete_consultation.sql
-- RPC функция для удаления консультации администратором
-- Применять в Supabase SQL Editor.

-- RPC функция для удаления консультации администратором
create or replace function public.admin_delete_consultation(
  p_consultation_id bigint
)
returns void
language plpgsql
security definer
as $$
begin
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  if auth.uid() is null then
    raise exception 'Требуется аутентификация';
  end if;

  -- Удаляем консультацию (только если она отменена)
  delete from public.consultations
  where id = p_consultation_id
    and status = 'cancelled';

  if not found then
    raise exception 'Консультация не найдена или не может быть удалена (только отмененные консультации можно удалять)';
  end if;
end;
$$;

-- Гранты для выполнения RPC функции
grant execute on function public.admin_delete_consultation to authenticated;

-- Примечание:
-- Эта функция позволяет администратору удалять только отмененные консультации
-- Удаление происходит безвозвратно
