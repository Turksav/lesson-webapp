# Настройка переменных окружения для видео

## Для прямой интеграции с Supabase (рекомендуется)

Добавьте в ваш `.env.local` файл:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Как получить ключи:

1. Откройте Supabase Dashboard
2. Settings → API
3. Скопируйте:
   - **URL**: Project URL
   - **ANON KEY**: anon public key
   - **SERVICE_ROLE_KEY**: service_role secret key ⚠️

⚠️ **Важно**: Service Role Key имеет полные права доступа, НЕ публикуйте его в коде!

## Для интеграции через n8n

В файле `app/api/get-video-url/route.ts` измените:
```typescript
const USE_N8N = true; // Включить n8n
```

И обновите n8n webhook URL:
```typescript
const n8nWebhookUrl = 'ваш-актуальный-ngrok-url';
```