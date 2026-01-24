# Настройка Kinescope.io Integration

## Переменные окружения

Добавьте в ваш `.env.local` файл следующие переменные:

```bash
# Kinescope Configuration
KINESCOPE_API_KEY=your_kinescope_api_key_here
KINESCOPE_PROJECT_ID=your_project_id_here

# Existing Supabase variables (still needed for database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Как получить Kinescope API ключи

### 1. Получение API Key

1. Войдите в [панель управления Kinescope](https://kinescope.io/admin)
2. Перейдите в **Настройки** → **API**
3. Создайте новый API ключ или скопируйте существующий
4. Скопируйте токен (он выглядит примерно так: `ksc_xxxxxxxxxxxxxxxxxxxxx`)

### 2. Получение Project ID

1. В панели Kinescope перейдите в **Настройки проекта**
2. В разделе **Основные настройки** найдите **Project ID**
3. Скопируйте ID (выглядит как короткая строка: `abc123def`)

## Пример конфигурации

```bash
# .env.local
KINESCOPE_API_KEY=ksc_1234567890abcdef1234567890abcdef
KINESCOPE_PROJECT_ID=abc123def

NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Проверка настроек

После настройки переменных окружения:

1. Перезапустите сервер разработки: `npm run dev`
2. Откройте страницу урока с Kinescope Video ID
3. Проверьте консоль браузера на наличие ошибок

## Получение Kinescope Video ID

1. Загрузите видео в Kinescope
2. В списке видео нажмите на нужное видео
3. В URL или в настройках видео найдите ID видео
4. ID выглядит как: `abc123def456` (буквы, цифры, дефисы)
5. Используйте этот ID в админ-панели при создании урока

## Безопасность

- **НЕ** коммитьте файл `.env.local` в git
- API ключи должны храниться только в переменных окружения
- Используйте разные ключи для разработки и продакшена

## Устранение проблем

### Ошибка "Invalid Kinescope API credentials"
- Проверьте правильность `KINESCOPE_API_KEY`
- Убедитесь, что ключ активен в панели Kinescope

### Ошибка "Video not found"
- Проверьте правильность `KINESCOPE_PROJECT_ID`
- Убедитесь, что видео существует в указанном проекте
- Проверьте правильность Video ID в админ-панели

### Видео не загружается
- Проверьте статус видео в панели Kinescope (должен быть "ready")
- Убедитесь, что домен добавлен в настройки проекта Kinescope
- Проверьте консоль браузера на наличие ошибок CORS

## Миграция данных

После настройки системы нужно обновить существующие уроки:

1. Примените SQL скрипт `db/016_kinescope_integration.sql`
2. В админ-панели замените старые `video_path` на Kinescope Video ID
3. Удалите неиспользуемые файлы из Supabase Storage (опционально)