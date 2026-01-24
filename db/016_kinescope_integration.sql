-- 016_kinescope_integration.sql
-- Миграция с Supabase Storage на Kinescope.io для видео уроков
-- Применять в Supabase SQL Editor.

-- 1) Переименовываем поле video_path в kinescope_video_id
DO $$
BEGIN
    -- Проверяем, существует ли поле video_path
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'video_path'
    ) THEN
        -- Переименовываем поле
        ALTER TABLE public.lessons RENAME COLUMN video_path TO kinescope_video_id;
        RAISE NOTICE 'Поле video_path переименовано в kinescope_video_id';
    ELSE
        -- Создаем новое поле, если его нет
        ALTER TABLE public.lessons ADD COLUMN kinescope_video_id text;
        RAISE NOTICE 'Создано поле kinescope_video_id в таблице lessons';
    END IF;
END $$;

-- 2) Обновляем комментарий к полю
COMMENT ON COLUMN public.lessons.kinescope_video_id IS 'ID видео в Kinescope.io (например: abc123def456)';

-- 3) Обновляем RPC функцию для создания/обновления урока
DROP FUNCTION IF EXISTS public.create_or_update_lesson(
  p_id bigint,
  p_title text,
  p_course_id bigint,
  p_order_index int,
  p_video_path text
);

CREATE FUNCTION public.create_or_update_lesson(
  p_id bigint default null,
  p_title text default null,
  p_course_id bigint default null,
  p_order_index int default 0,
  p_kinescope_video_id text default null
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lesson_id bigint;
BEGIN
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  IF auth.uid() IS NULL then
    RAISE EXCEPTION 'Требуется аутентификация';
  END IF;

  -- Валидация данных
  IF p_title IS NULL OR trim(p_title) = '' then
    RAISE EXCEPTION 'Название урока обязательно';
  END IF;

  -- Валидация Kinescope Video ID (должен содержать только буквы, цифры и дефисы)
  IF p_kinescope_video_id IS NOT NULL AND p_kinescope_video_id !~ '^[a-zA-Z0-9_-]+$' then
    RAISE EXCEPTION 'Неверный формат Kinescope Video ID. Используйте только буквы, цифры, дефисы и подчеркивания.';
  END IF;

  -- Если передан ID, обновляем существующий урок
  IF p_id IS NOT NULL then
    UPDATE public.lessons
    SET
      title = p_title,
      course_id = p_course_id,
      order_index = p_order_index,
      kinescope_video_id = p_kinescope_video_id
    WHERE id = p_id
    RETURNING id INTO v_lesson_id;

    IF v_lesson_id IS NULL then
      RAISE EXCEPTION 'Урок с ID % не найден', p_id;
    END IF;

    RETURN v_lesson_id;
  ELSE
    -- Создаём новый урок
    INSERT INTO public.lessons (
      title,
      course_id,
      order_index,
      kinescope_video_id
    )
    VALUES (
      p_title,
      p_course_id,
      p_order_index,
      p_kinescope_video_id
    )
    RETURNING id INTO v_lesson_id;

    RETURN v_lesson_id;
  END IF;
END;
$$;

-- 4) Гранты для выполнения обновленной RPC функции
GRANT EXECUTE ON FUNCTION public.create_or_update_lesson TO authenticated;

-- 5) Создаем индекс для быстрого поиска по Kinescope Video ID
CREATE INDEX IF NOT EXISTS lessons_kinescope_video_id_idx 
ON public.lessons(kinescope_video_id) 
WHERE kinescope_video_id IS NOT NULL;

-- 6) Добавляем функцию для получения уроков с видео
CREATE OR REPLACE FUNCTION public.get_lessons_with_video()
RETURNS TABLE (
  lesson_id bigint,
  title text,
  course_id bigint,
  kinescope_video_id text,
  course_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as lesson_id,
    l.title,
    l.course_id,
    l.kinescope_video_id,
    c.title as course_title
  FROM public.lessons l
  LEFT JOIN public.courses c ON l.course_id = c.id
  WHERE l.kinescope_video_id IS NOT NULL
  ORDER BY c.title, l.order_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lessons_with_video TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lessons_with_video TO anon;

-- Заметки для администратора:
-- 1. После применения этого скрипта все существующие значения video_path 
--    станут kinescope_video_id, но их нужно будет обновить на реальные ID из Kinescope
-- 2. Старые значения типа "course-1/lesson-1/video.mp4" нужно заменить на 
--    Kinescope Video ID типа "abc123def456"