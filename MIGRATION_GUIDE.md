# Миграция с Supabase Storage на Kinescope.io

## Пошаговая инструкция миграции

### 1. Применить SQL миграцию

Выполните в Supabase SQL Editor содержимое файла `db/016_kinescope_integration.sql`:

```sql
-- Этот скрипт переименует video_path в kinescope_video_id 
-- и обновит RPC функции
```

### 2. Настроить переменные окружения

Добавьте в `.env.local`:

```bash
KINESCOPE_API_KEY=your_api_key
KINESCOPE_PROJECT_ID=your_project_id
```

См. подробную инструкцию в `KINESCOPE_SETUP.md`.

### 3. Обновить существующие уроки

После применения миграции все поля `video_path` станут `kinescope_video_id`, но их значения нужно обновить:

**Было (в video_path):**
```
course-1/lesson-1/intro.mp4
course-1/lesson-2/practice.mp4
```

**Должно стать (в kinescope_video_id):**
```
abc123def456
xyz789ghi012
```

### 4. Перезапустить приложение

```bash
npm run dev
```

### 5. Проверить работу

1. Откройте админ-панель → Уроки
2. Отредактируйте урок и добавьте Kinescope Video ID
3. Откройте страницу урока и проверьте воспроизведение

## Что изменилось

### Удалено
- ❌ Зависимость от Supabase Storage
- ❌ Интеграция с n8n для signed URLs
- ❌ HTML5 `<video>` элемент
- ❌ Поле `video_path` в базе данных

### Добавлено
- ✅ Интеграция с Kinescope API
- ✅ Kinescope iframe embed
- ✅ Адаптивное качество видео
- ✅ Поле `kinescope_video_id` в базе данных
- ✅ Автоматическая проверка статуса видео
- ✅ Retry механизм для обрабатывающихся видео

## Преимущества новой системы

- **Лучшее качество**: Адаптивное качество видео
- **Быстрая загрузка**: CDN Kinescope
- **Аналитика**: Встроенная аналитика просмотров
- **Защита контента**: DRM и watermarks (при настройке)
- **Простота управления**: Меньше компонентов для поддержки

## Откат (если понадобится)

Если нужно вернуться к старой системе:

1. Переименовать `kinescope_video_id` обратно в `video_path`
2. Восстановить старый API endpoint
3. Восстановить HTML5 VideoPlayer
4. Установить обратно `@supabase/supabase-js`

## Поддержка

В случае проблем проверьте:
- Консоль браузера (Developer Tools → Console)
- Логи сервера (терминал с `npm run dev`)
- Настройки Kinescope API
- Статус видео в панели Kinescope