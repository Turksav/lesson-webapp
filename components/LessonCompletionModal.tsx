'use client';

import { useState, useRef, useEffect } from 'react';

interface LessonCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: {
    id: number;
    question: string | null;
    allow_photo_upload: boolean;
  };
  onSuccess: () => void;
  initialAnswer?: string;
  initialPhotoUrl?: string | null;
}

export default function LessonCompletionModal({
  isOpen,
  onClose,
  lesson,
  onSuccess,
  initialAnswer,
  initialPhotoUrl,
}: LessonCompletionModalProps) {
  const [answer, setAnswer] = useState(initialAnswer || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обновляем состояние при изменении initialAnswer/initialPhotoUrl
  useEffect(() => {
    if (isOpen) {
      setAnswer(initialAnswer || '');
      setPhotoUrl(initialPhotoUrl || null);
    }
  }, [isOpen, initialAnswer, initialPhotoUrl]);

  if (!isOpen) return null;

  const handlePhotoSelect = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    
    if (tg && tg.showPhotoPicker) {
      // Используем Telegram WebApp API для выбора фото
      tg.showPhotoPicker(
        {
          source: 'gallery',
        },
        async (photos: any[]) => {
          if (photos && photos.length > 0) {
            // Telegram возвращает file_id или blob
            // Загружаем в Cloudflare R2
            await uploadPhotoToStorage(photos[0]);
          }
        }
      );
    } else if (fileInputRef.current) {
      // Fallback на обычный input файла
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadPhotoToStorage(file);
  };

  const uploadPhotoToStorage = async (fileOrBlob: File | Blob | string) => {
    setUploading(true);
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      const telegramUserId =
        (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

      if (!telegramUserId) {
        throw new Error('Telegram user ID not found');
      }

      // Если это blob или file, конвертируем в File
      let file: File;
      if (fileOrBlob instanceof File) {
        file = fileOrBlob;
      } else if (fileOrBlob instanceof Blob) {
        file = new File([fileOrBlob], 'photo.jpg', { type: 'image/jpeg' });
      } else {
        // Если это URL или file_id от Telegram, нужно сначала получить файл
        throw new Error('Unsupported file type');
      }

      // Создаем уникальное имя файла
      const fileName = `lesson-${lesson.id}-user-${telegramUserId}-${Date.now()}.jpg`;
      const contentType = file.type || 'image/jpeg';

      // Запрашиваем presigned URL у сервера
      const presignedResponse = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType,
          telegramUserId: Number(telegramUserId),
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Ошибка при получении URL для загрузки');
      }

      const { uploadUrl, publicUrl } = await presignedResponse.json();

      // Загружаем файл напрямую в R2 через presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Ошибка при загрузке файла в R2');
      }

      // Сохраняем публичный URL
      setPhotoUrl(publicUrl);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert('Не удалось загрузить фото: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert('Пожалуйста, введите ответ на вопрос');
      return;
    }

    setSubmitting(true);

    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      alert('Требуется авторизация Telegram');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/check-lesson-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lesson_id: lesson.id,
          user_answer: answer,
          photo_url: photoUrl,
          telegram_user_id: Number(telegramUserId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при проверке ответа');
      }

      if (data.approved) {
        alert('Ваш ответ принят. Завтра можете приступить к выполнению следующего урока.');
        setAnswer('');
        setPhotoUrl(null);
        onSuccess();
        onClose();
      } else {
        // Если ответ не принят, не закрываем модальное окно, чтобы пользователь мог редактировать
        alert(data.message || 'Ответ не подходит. Посмотрите видео ещё раз и попробуйте ответить снова.');
        // Обновляем данные, чтобы показать текущий ответ на странице урока
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      alert('Ошибка: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Завершить урок</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {lesson.question && (
            <div className="form-group">
              <label>Вопрос к уроку:</label>
              <p style={{ marginBottom: '12px', fontWeight: '500' }}>{lesson.question}</p>
            </div>
          )}
          <div className="form-group">
            <label>Ваш ответ:</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-textarea"
              rows={5}
              placeholder="Введите ваш ответ на вопрос..."
            />
          </div>
          {lesson.allow_photo_upload && (
            <div className="form-group">
              <label>Фото результата задания (необязательно):</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handlePhotoSelect}
                disabled={uploading}
                style={{ marginTop: '8px' }}
              >
                {uploading ? 'Загружаем...' : photoUrl ? '✓ Фото загружено' : '📷 Загрузить фото'}
              </button>
              {photoUrl && (
                <div style={{ marginTop: '8px' }}>
                  <img src={photoUrl} alt="Uploaded" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !answer.trim()}
          >
            {submitting ? 'Отправляем...' : 'Отправить ответ'}
          </button>
        </div>
      </div>
    </div>
  );
}
