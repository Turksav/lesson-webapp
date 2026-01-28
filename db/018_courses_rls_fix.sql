-- 018_courses_rls_fix.sql
-- RLS политики и RPC функции для таблицы courses (для админ-панели)
-- Применять в Supabase SQL Editor.

-- 1) Включаем RLS для таблицы courses (если еще не включен)
alter table public.courses enable row level security;

-- 2) Удаляем старые политики если они существуют
drop policy if exists "Курсы доступны для чтения всем" on public.courses;
drop policy if exists "Курсы можно создавать только через сервисную роль" on public.courses;
drop policy if exists "Курсы можно обновлять только через сервисную роль" on public.courses;
drop policy if exists "Курсы можно удалять только через сервисную роль" on public.courses;

-- Политика на чтение (SELECT) - все могут читать курсы
create policy "courses_select_all"
  on public.courses
  for select
  using (true);

-- 3) RPC функция для создания или обновления курса
create or replace function public.create_or_update_course(
  p_id bigint default null,
  p_title text default null,
  p_description text default null,
  p_image_url text default null,
  p_price numeric(12, 2) default 0.00
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_course_id bigint;
begin
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  if auth.uid() is null then
    raise exception 'Требуется аутентификация';
  end if;

  -- Валидация данных
  if p_title is null or trim(p_title) = '' then
    raise exception 'Название курса обязательно';
  end if;

  -- Если передан ID, обновляем существующий курс
  if p_id is not null then
    update public.courses
    set
      title = p_title,
      description = p_description,
      image_url = p_image_url,
      price = coalesce(p_price, 0.00)
    where id = p_id
    returning id into v_course_id;

    if v_course_id is null then
      raise exception 'Курс с ID % не найден', p_id;
    end if;

    return v_course_id;
  else
    -- Создаём новый курс
    insert into public.courses (
      title,
      description,
      image_url,
      price
    )
    values (
      p_title,
      p_description,
      p_image_url,
      coalesce(p_price, 0.00)
    )
    returning id into v_course_id;

    return v_course_id;
  end if;
end;
$$;

-- 4) RPC функция для удаления курса
create or replace function public.delete_course(
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

  -- Удаляем курс (каскадное удаление записей на курс произойдет автоматически)
  delete from public.courses
  where id = p_id;

  if not found then
    raise exception 'Курс с ID % не найден', p_id;
  end if;
end;
$$;

-- 5) Гранты для выполнения RPC функций
grant execute on function public.create_or_update_course to authenticated;
grant execute on function public.delete_course to authenticated;

-- Примечание:
-- Теперь создание, обновление и удаление курсов должно происходить через RPC функции:
-- supabase.rpc('create_or_update_course', { p_id: null, p_title: ..., p_description: ..., p_image_url: ..., p_price: ... })
-- supabase.rpc('create_or_update_course', { p_id: 123, p_title: ..., ... }) -- для обновления
-- supabase.rpc('delete_course', { p_id: 123 })
-- Это безопасно, так как функции проверяют аутентификацию и выполняются с правами создателя
