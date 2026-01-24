-- 015_lessons_video_field.sql
-- Добавление поля video_path в таблицу lessons
-- Применять в Supabase SQL Editor.

-- Добавляем поле video_path в таблицу lessons
ALTER TABLE public.lessons 
ADD COLUMN video_path text;

COMMENT ON COLUMN public.lessons.video_path IS 'Путь к видеофайлу в Supabase Storage bucket lesson-videos';

-- Обновляем RPC функцию для создания/обновления урока
CREATE OR REPLACE FUNCTION public.create_or_update_lesson(
  p_id bigint default null,
  p_title text default null,
  p_course_id bigint default null,
  p_order_index int default 0,
  p_video_path text default null
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

  -- Если передан ID, обновляем существующий урок
  IF p_id IS NOT NULL then
    UPDATE public.lessons
    SET
      title = p_title,
      course_id = p_course_id,
      order_index = p_order_index,
      video_path = p_video_path
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
      video_path
    )
    VALUES (
      p_title,
      p_course_id,
      p_order_index,
      p_video_path
    )
    RETURNING id INTO v_lesson_id;

    RETURN v_lesson_id;
  END IF;
END;
$$;

-- Гранты для выполнения обновленной RPC функции
GRANT EXECUTE ON FUNCTION public.create_or_update_lesson TO authenticated;