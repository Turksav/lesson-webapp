-- 011_lessons_rls_fix.sql
-- RLS политики и RPC функции для таблицы lessons (для админ-панели)
-- Применять в Supabase SQL Editor.

-- 1) Включаем RLS для таблицы lessons (если еще не включен)
alter table public.lessons enable row level security;

-- 2) Удаляем политику если она существует, затем создаем новую
drop policy if exists "lessons_select_all" on public.lessons;

-- Политика на чтение (SELECT) - все могут читать уроки
create policy "lessons_select_all"
  on public.lessons
  for select
  using (true);

-- 3) RPC функция для создания или обновления урока
create or replace function public.create_or_update_lesson(
  p_id bigint default null,
  p_title text default null,
  p_course_id bigint default null,
  p_order_index int default 0
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_lesson_id bigint;
begin
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  if auth.uid() is null then
    raise exception 'Требуется аутентификация';
  end if;

  -- Валидация данных
  if p_title is null or trim(p_title) = '' then
    raise exception 'Название урока обязательно';
  end if;

  -- Если передан ID, обновляем существующий урок
  if p_id is not null then
    update public.lessons
    set
      title = p_title,
      course_id = p_course_id,
      order_index = p_order_index
    where id = p_id
    returning id into v_lesson_id;

    if v_lesson_id is null then
      raise exception 'Урок с ID % не найден', p_id;
    end if;

    return v_lesson_id;
  else
    -- Создаём новый урок
    insert into public.lessons (
      title,
      course_id,
      order_index
    )
    values (
      p_title,
      p_course_id,
      p_order_index
    )
    returning id into v_lesson_id;

    return v_lesson_id;
  end if;
end;
$$;

-- 4) RPC функция для удаления урока
create or replace function public.delete_lesson(
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

  -- Удаляем урок (каскадное удаление занятий произойдет автоматически)
  delete from public.lessons
  where id = p_id;

  if not found then
    raise exception 'Урок с ID % не найден', p_id;
  end if;
end;
$$;

-- 5) Гранты для выполнения RPC функций
grant execute on function public.create_or_update_lesson to authenticated;
grant execute on function public.delete_lesson to authenticated;

-- Примечание:
-- Теперь создание, обновление и удаление уроков должно происходить через RPC функции:
-- supabase.rpc('create_or_update_lesson', { p_id: null, p_title: ..., p_course_id: ..., p_order_index: ... })
-- supabase.rpc('create_or_update_lesson', { p_id: 123, p_title: ..., ... }) -- для обновления
-- supabase.rpc('delete_lesson', { p_id: 123 })
-- Это безопасно, так как функции проверяют аутентификацию и выполняются с правами создателя
