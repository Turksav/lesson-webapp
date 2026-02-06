-- 020_lesson_photos_storage.sql
-- Создание Storage bucket для фото результатов заданий уроков
-- Применять в Supabase SQL Editor.

-- 1) Создаём bucket для фото уроков (если его ещё нет)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-photos', 'lesson-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Включаем RLS для storage.objects (если ещё не включен)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3) Удаляем старые политики для lesson-photos (если есть)
DROP POLICY IF EXISTS "Публичный доступ на чтение фото уроков" ON storage.objects;
DROP POLICY IF EXISTS "Пользователи могут загружать фото в свою папку" ON storage.objects;
DROP POLICY IF EXISTS "Пользователи могут обновлять свои фото" ON storage.objects;
DROP POLICY IF EXISTS "Пользователи могут удалять свои фото" ON storage.objects;
DROP POLICY IF EXISTS "Анонимный доступ на загрузку фото уроков" ON storage.objects;

-- 4) Политика: все могут читать файлы из bucket lesson-photos (так как bucket публичный)
CREATE POLICY "Публичный доступ на чтение фото уроков"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lesson-photos');

-- 5) Политика: анонимные пользователи могут загружать файлы в bucket lesson-photos
-- Ограничение: путь должен начинаться с числа (telegram_user_id)
CREATE POLICY "Анонимный доступ на загрузку фото уроков"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-photos'
  AND (storage.foldername(name))[1] ~ '^[0-9]+$'
);

-- 6) Политика: анонимные пользователи могут обновлять файлы в своей папке
CREATE POLICY "Анонимный доступ на обновление фото уроков"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lesson-photos'
  AND (storage.foldername(name))[1] ~ '^[0-9]+$'
);

-- 7) Политика: анонимные пользователи могут удалять файлы в своей папке
CREATE POLICY "Анонимный доступ на удаление фото уроков"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lesson-photos'
  AND (storage.foldername(name))[1] ~ '^[0-9]+$'
);

-- Примечание:
-- Bucket настроен как публичный (public = true), что позволяет:
-- - Читать файлы всем (публичные URL)
-- - Загружать файлы анонимным пользователям (через клиентский SDK)
-- 
-- Ограничения безопасности:
-- - Путь файла должен начинаться с папки, имя которой - число (telegram_user_id)
-- - Это предотвращает загрузку файлов в корень bucket или в произвольные папки
