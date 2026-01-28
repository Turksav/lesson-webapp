-- 019_user_progress_update_fix.sql
-- RPC функция для безопасного обновления прогресса пользователя
-- Применять в Supabase SQL Editor.

-- Создаём RPC функцию для обновления прогресса
CREATE OR REPLACE FUNCTION public.update_user_progress(
  p_telegram_user_id bigint,
  p_lesson_id bigint,
  p_status text,
  p_user_answer text,
  p_photo_url text DEFAULT NULL,
  p_completed_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем, существует ли запись
  IF EXISTS (
    SELECT 1 
    FROM public.user_progress 
    WHERE telegram_user_id = p_telegram_user_id 
      AND lesson_id = p_lesson_id
  ) THEN
    -- Обновляем существующую запись
    -- Явно устанавливаем updated_at, чтобы избежать проблем с триггером
    UPDATE public.user_progress
    SET
      status = p_status,
      user_answer = p_user_answer,
      photo_url = p_photo_url,
      completed_at = COALESCE(p_completed_at, completed_at), -- Сохраняем существующее значение если не передано
      updated_at = now() -- Явно устанавливаем updated_at
    WHERE telegram_user_id = p_telegram_user_id
      AND lesson_id = p_lesson_id;
  ELSE
    -- Создаём новую запись
    -- updated_at будет установлен через DEFAULT now() в схеме таблицы
    INSERT INTO public.user_progress (
      telegram_user_id,
      lesson_id,
      status,
      user_answer,
      photo_url,
      completed_at
    )
    VALUES (
      p_telegram_user_id,
      p_lesson_id,
      p_status,
      p_user_answer,
      p_photo_url,
      p_completed_at
    );
  END IF;
END;
$$;

-- Гранты для выполнения RPC функции
GRANT EXECUTE ON FUNCTION public.update_user_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_progress TO anon;

-- Примечание:
-- Эта функция правильно обрабатывает updated_at через триггер
-- Использование: supabase.rpc('update_user_progress', { p_telegram_user_id: ..., p_lesson_id: ..., p_status: ..., p_user_answer: ..., p_photo_url: ..., p_completed_at: ... })
