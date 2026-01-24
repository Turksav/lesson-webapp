-- 015_lessons_video_field_safe.sql
-- Безопасное добавление поля video_path в таблицу lessons
-- Применять в Supabase SQL Editor.

-- Добавляем поле video_path в таблицу lessons (если его еще нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'video_path'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN video_path text;
        RAISE NOTICE 'Добавлен столбец video_path в таблицу lessons';
    ELSE
        RAISE NOTICE 'Столбец video_path уже существует в таблице lessons';
    END IF;
END $$;

-- Добавляем комментарий
COMMENT ON COLUMN public.lessons.video_path IS 'Путь к видеофайлу в Supabase Storage bucket lesson-videos';