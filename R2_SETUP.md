# Настройка Cloudflare R2 для хранения фото ответов на уроки

## Шаги настройки

### 1. Создание R2 bucket в Cloudflare

1. Войдите в [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите в раздел **R2** → **Create bucket**
3. Создайте bucket с именем `lesson-photos`
4. Настройте публичный доступ:
   - В настройках bucket включите **Public Access**
   - Запишите публичный URL (например, `https://pub-xxxxx.r2.dev`)
   - Или настройте custom domain (рекомендуется)

### 2. Настройка CORS

В настройках bucket добавьте CORS правило:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "https://*.vercel.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Замените `yourdomain.com` на ваш домен.

### 3. Создание API Token

1. В Cloudflare Dashboard перейдите в **R2** → **Manage R2 API Tokens**
2. Нажмите **Create API token**
3. Выберите разрешения:
   - **Object Read & Write** для bucket `lesson-photos`
4. Сохраните **Access Key ID** и **Secret Access Key**

### 4. Переменные окружения

Добавьте в `.env.local` (для локальной разработки) и в настройках вашего хостинга (Vercel/другой):

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=lesson-photos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Где найти Account ID:**
- В Cloudflare Dashboard → R2 → любой bucket → в URL будет `https://dash.cloudflare.com/xxxxx/r2/...`
- Или в настройках аккаунта → справа внизу

### 5. Установка зависимостей

```bash
npm install
```

Зависимости уже добавлены в `package.json`:
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

## Проверка работы

1. Запустите приложение: `npm run dev`
2. Откройте урок с разрешением на загрузку фото
3. Попробуйте загрузить фото
4. Проверьте, что фото отображается после загрузки

## Миграция существующих фото (опционально)

Если у вас уже есть фото в Supabase Storage, можно создать скрипт для миграции:

1. Получить список всех файлов из Supabase Storage bucket `lesson-photos`
2. Для каждого файла:
   - Скачать файл из Supabase
   - Загрузить в R2 с тем же путем
   - Обновить URL в базе данных (`user_progress.photo_url`)

## Обратная совместимость

Существующие URL из Supabase Storage продолжат работать до полной миграции. Новые фото будут загружаться в R2.
