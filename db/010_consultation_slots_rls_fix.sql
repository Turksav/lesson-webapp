-- 010_consultation_slots_rls_fix.sql
-- RPC функции для управления слотами консультаций (для админ-панели)
-- Применять в Supabase SQL Editor.

-- 1) RPC функция для создания или обновления слота
create or replace function public.create_or_update_consultation_slot(
  p_id bigint default null,
  p_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_is_available boolean default true
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_slot_id bigint;
begin
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  if auth.uid() is null then
    raise exception 'Требуется аутентификация';
  end if;

  -- Валидация данных
  if p_date is null or p_start_time is null or p_end_time is null then
    raise exception 'Дата, время начала и время окончания обязательны';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'Время начала должно быть раньше времени окончания';
  end if;

  -- Если передан ID, обновляем существующий слот
  if p_id is not null then
    update public.consultation_slots
    set
      date = p_date,
      start_time = p_start_time,
      end_time = p_end_time,
      is_available = p_is_available,
      updated_at = now()
    where id = p_id
    returning id into v_slot_id;

    if v_slot_id is null then
      raise exception 'Слот с ID % не найден', p_id;
    end if;

    return v_slot_id;
  else
    -- Создаём новый слот
    insert into public.consultation_slots (
      date,
      start_time,
      end_time,
      is_available
    )
    values (
      p_date,
      p_start_time,
      p_end_time,
      p_is_available
    )
    returning id into v_slot_id;

    return v_slot_id;
  end if;
end;
$$;

-- 2) RPC функция для удаления слота
create or replace function public.delete_consultation_slot(
  p_id bigint
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

  -- Удаляем слот
  delete from public.consultation_slots
  where id = p_id;

  if not found then
    raise exception 'Слот с ID % не найден', p_id;
  end if;
end;
$$;

-- 3) Гранты для выполнения RPC функций
-- Разрешаем только аутентифицированным пользователям (через Supabase Auth)
grant execute on function public.create_or_update_consultation_slot to authenticated;
grant execute on function public.delete_consultation_slot to authenticated;

-- 4) Обновляем RLS политики для consultation_slots
-- Оставляем SELECT для всех, но INSERT/UPDATE/DELETE только через RPC функции
-- Политики INSERT/UPDATE/DELETE не нужны, так как операции выполняются через RPC функции с SECURITY DEFINER

-- Примечание:
-- Теперь создание, обновление и удаление слотов должно происходить через RPC функции:
-- supabase.rpc('create_or_update_consultation_slot', { p_id: null, p_date: ..., p_start_time: ..., p_end_time: ..., p_is_available: ... })
-- supabase.rpc('create_or_update_consultation_slot', { p_id: 123, p_date: ..., ... }) -- для обновления
-- supabase.rpc('delete_consultation_slot', { p_id: 123 })
-- Это безопасно, так как функции проверяют аутентификацию и выполняются с правами создателя
