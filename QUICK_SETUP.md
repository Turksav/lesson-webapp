# Быстрая настройка Kinescope

## Шаг 1: Создайте файл `.env.local`

В корне проекта (рядом с `package.json`) создайте файл `.env.local` со следующим содержимым:

```bash
# Kinescope Configuration
KINESCOPE_API_KEY=ваш_api_ключ_здесь
KINESCOPE_PROJECT_ID=ваш_project_id_здесь

# Supabase Configuration (если еще не настроено)
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
```

## Шаг 2: Получите ключи Kinescope

### API Key:
1. Откройте https://kinescope.io/admin
2. Войдите в аккаунт
3. Перейдите: **Настройки** → **API**
4. Скопируйте API ключ (начинается с `ksc_`)

### Project ID:
1. В панели Kinescope перейдите в **Настройки проекта**
2. Найдите **Project ID** в основных настройках
3. Скопируйте ID

## Шаг 3: Вставьте ключи в `.env.local`

Замените `ваш_api_ключ_здесь` и `ваш_project_id_здесь` на реальные значения.

## Шаг 4: Перезапустите сервер

1. Остановите сервер (Ctrl+C)
2. Запустите снова: `npm run dev`

## Проверка

После перезапуска откройте страницу урока с видео. Ошибка должна исчезнуть.

## Важно

- Файл `.env.local` НЕ должен быть в git (уже в `.gitignore`)
- После изменения `.env.local` всегда перезапускайте сервер
- API ключи должны быть секретными, не публикуйте их