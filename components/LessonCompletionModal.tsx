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
  initialPhotoUrls?: string[];
}

export default function LessonCompletionModal({
  isOpen,
  onClose,
  lesson,
  onSuccess,
  initialAnswer,
  initialPhotoUrls,
}: LessonCompletionModalProps) {
  const [answer, setAnswer] = useState(initialAnswer || '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialPhotoUrls || []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAnswer(initialAnswer || '');
      setPhotoUrls(initialPhotoUrls || []);
    }
  }, [isOpen, initialAnswer, initialPhotoUrls]);

  if (!isOpen) return null;

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGallerySelect = () => {
    // #region agent log
    const tg = (window as any)?.Telegram?.WebApp;
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LessonCompletionModal.tsx:handleGallerySelect',message:'Gallery: tg/showPhotoPicker check',data:{hasTg:!!tg,hasShowPhotoPicker:!!tg?.showPhotoPicker},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (tg && tg.showPhotoPicker) {
      tg.showPhotoPicker({ source: 'gallery' }, async (photos: any[]) => {
        if (photos && photos.length > 0) {
          for (const photo of photos) {
            await uploadOneToStorage(photo);
          }
        }
      });
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleCameraSelect = () => {
    // #region agent log
    const tg = (window as any)?.Telegram?.WebApp;
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LessonCompletionModal.tsx:handleCameraSelect',message:'Camera branch',data:{inTelegram:!!(tg?.showPhotoPicker)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    // In Telegram WebView camera input only shows file picker; open gallery picker and take one photo (user can take photo in Camera app first, then select it)
    if (tg && tg.showPhotoPicker) {
      tg.showPhotoPicker({ source: 'gallery' }, async (photos: any[]) => {
        if (photos && photos.length > 0) {
          await uploadOneToStorage(photos[0]);
        }
      });
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      await uploadOneToStorage(files[i]);
    }
    e.target.value = '';
  };

  const handleCameraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadOneToStorage(file);
    e.target.value = '';
  };

  const uploadOneToStorage = async (fileOrBlob: File | Blob | string) => {
    setUploading(true);
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      const telegramUserId =
        (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

      if (!telegramUserId) {
        throw new Error('Telegram user ID not found');
      }

      let file: File;
      if (fileOrBlob instanceof File) {
        file = fileOrBlob;
      } else if (fileOrBlob instanceof Blob) {
        file = new File([fileOrBlob], 'photo.jpg', { type: 'image/jpeg' });
      } else {
        throw new Error('Unsupported file type');
      }

      const fileName = `lesson-${lesson.id}-user-${telegramUserId}-${Date.now()}.jpg`;
      const contentType = file.type || 'image/jpeg';

      const presignedResponse = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Ошибка при загрузке файла в R2');
      }

      setPhotoUrls((prev) => [...prev, publicUrl]);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert('Не удалось загрузить фото: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getPhotoUrlPayload = (): string | null => {
    if (photoUrls.length === 0) return null;
    if (photoUrls.length === 1) return photoUrls[0];
    return JSON.stringify(photoUrls);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lesson.id,
          user_answer: answer,
          photo_url: getPhotoUrlPayload(),
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
        setPhotoUrls([]);
        onSuccess();
        onClose();
      } else {
        alert(data.message || 'Ответ не подходит. Посмотрите видео ещё раз и попробуйте ответить снова.');
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
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraFileChange}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleGallerySelect}
                  disabled={uploading}
                >
                  {uploading ? 'Загружаем...' : 'Выбрать из галереи'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCameraSelect}
                  disabled={uploading}
                >
                  Сделать фото
                </button>
              </div>
              {typeof window !== 'undefined' && (window as any)?.Telegram?.WebApp?.showPhotoPicker && (
                <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                  В Telegram: сделайте снимок в приложении «Камера», затем нажмите «Сделать фото» и выберите его в списке.
                </p>
              )}
              {photoUrls.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {photoUrls.map((url, index) => (
                    <div key={url} style={{ position: 'relative' }}>
                      <img
                        src={url}
                        alt={`Фото ${index + 1}`}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          lineHeight: 1,
                          padding: 0,
                        }}
                        aria-label="Удалить"
                      >
                        ×
                      </button>
                    </div>
                  ))}
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
