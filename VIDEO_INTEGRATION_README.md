# Интеграция видео с n8n и Supabase Storage

## Обзор

Система поддерживает воспроизведение видео для уроков через Supabase Storage bucket `lesson-videos` с использованием signed URLs, генерируемых через n8n.

## Структура

### База данных
- Добавлено поле `video_path` в таблицу `lessons`
- Обновлена RPC функция `create_or_update_lesson` для работы с видео

### Компоненты
- `VideoPlayer.tsx` - компонент для воспроизведения видео
- API endpoint `/api/get-video-url` - получение signed URL через n8n
- Интеграция в страницу урока `/lesson/[id]`

## Настройка n8n

### 1. Создание Workflow в n8n

Создайте workflow со следующими узлами:

1. **Webhook Trigger**
   - HTTP Method: POST
   - Path: `/generate-video-url`
   - Authentication: None (или настройте по необходимости)

2. **Supabase Storage Node**
   - Operation: Create Signed URL
   - Bucket: `lesson-videos`
   - File Path: `{{ $json.path }}`
   - Expires In: `{{ $json.expiresIn || 3600 }}` (1 час по умолчанию)

3. **Respond to Webhook**
   - Response Body: 
   ```json
   {
     "signedUrl": "{{ $node['Supabase Storage'].json.signedUrl }}",
     "expiresAt": "{{ $node['Supabase Storage'].json.expiresAt }}"
   }
   ```

### 2. Конфигурация Supabase в n8n

В настройках Supabase Storage Node:
- **Supabase URL**: `https://your-project.supabase.co`
- **Supabase Key**: Service Role Key (не anon key!)
- **Bucket**: `lesson-videos`

### 3. Обновление API endpoint

В файле `app/api/get-video-url/route.ts` замените заглушку на реальный вызов:

```typescript
// Замените YOUR_N8N_WEBHOOK_URL на реальный URL
const n8nResponse = await fetch('https://your-n8n-instance.com/webhook/generate-video-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    bucket: 'lesson-videos',
    path: videoPath,
    expiresIn: 3600, // 1 час
  }),
});

if (!n8nResponse.ok) {
  throw new Error('Failed to get signed URL from n8n');
}

const data = await n8nResponse.json();
return NextResponse.json({ signedUrl: data.signedUrl });
```

## Использование в админ-панели

1. Откройте страницу "Уроки" в админ-панели
2. При создании/редактировании урока заполните поле "Путь к видео"
3. Укажите путь относительно bucket, например: `lesson-1/intro.mp4`
4. Сохраните урок

## Структура файлов в Storage

Рекомендуемая структура в bucket `lesson-videos`:

```
lesson-videos/
├── course-1/
│   ├── lesson-1/
│   │   ├── intro.mp4
│   │   └── practice.mp4
│   └── lesson-2/
│       └── theory.mp4
└── course-2/
    └── lesson-3/
        └── demo.mp4
```

## Форматы видео

Поддерживаемые форматы:
- MP4 (рекомендуется)
- WebM
- OGV

Рекомендации:
- Разрешение: 720p или 1080p
- Кодек: H.264
- Битрейт: 2-5 Mbps
- Формат аудио: AAC

## Безопасность

- Signed URLs имеют ограниченное время жизни (по умолчанию 1 час)
- Используйте Service Role Key в n8n, а не anon key
- Настройте RLS политики для bucket при необходимости

## Troubleshooting

### Видео не загружается
1. Проверьте правильность пути к файлу
2. Убедитесь, что файл существует в bucket
3. Проверьте работу n8n workflow
4. Проверьте настройки CORS в Supabase

### Ошибки в n8n
1. Проверьте конфигурацию Supabase Storage Node
2. Убедитесь, что Service Role Key корректный
3. Проверьте права доступа к bucket

### Проблемы с воспроизведением
1. Проверьте формат видео файла
2. Убедитесь, что браузер поддерживает формат
3. Проверьте размер файла (рекомендуется < 100MB)

## Мониторинг

Логи можно отслеживать в:
- Консоли браузера (компонент VideoPlayer)
- Next.js логах (API endpoint)
- n8n execution logs
- Supabase Dashboard (Storage logs)