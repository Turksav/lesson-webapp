'use client';

import { useEffect, useState } from 'react';

interface VideoPlayerProps {
  videoPath: string;
  title?: string;
}

export default function VideoPlayer({ videoPath, title }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        setLoading(true);
        setError('');

        // Здесь будет вызов к n8n для получения signed URL
        // Пока используем заглушку
        console.log('Requesting signed URL for video path:', videoPath);
        
        // TODO: Заменить на реальный вызов к n8n endpoint
         const response = await fetch('/api/get-video-url', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ videoPath }),
         });
        
         if (!response.ok) {
           throw new Error('Failed to get video URL');
         }
        
         const data = await response.json();
         setVideoUrl(data.signedUrl);

        // Временная заглушка - показываем placeholder
        //setVideoUrl('');
        //setError('Видео временно недоступно. Интеграция с n8n в процессе настройки.');
        
      } catch (err: any) {
        console.error('Error getting video URL:', err);
        console.error('Error details:', err.message);
        setError(`Не удалось загрузить видео: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (videoPath) {
      getSignedUrl();
    } else {
      setLoading(false);
      setError('Путь к видео не указан');
    }
  }, [videoPath]);

  if (loading) {
    return (
      <div className="video-player-container">
        <div className="video-placeholder loading">
          <div className="video-placeholder-content">
            <div className="spinner"></div>
            <p>Загружаем видео...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-player-container">
        <div className="video-placeholder error">
          <div className="video-placeholder-content">
            <div className="video-error-icon">📹</div>
            <p>{error}</p>
            <small>Путь: {videoPath}</small>
          </div>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="video-player-container">
        <div className="video-placeholder">
          <div className="video-placeholder-content">
            <div className="video-placeholder-icon">🎬</div>
            <p>Видео будет доступно после настройки n8n интеграции</p>
            <small>Путь: {videoPath}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <video
        controls
        preload="metadata"
        className="video-player"
        poster="/placeholder-video.jpg"
      >
        <source src={videoUrl} type="video/mp4" />
        <p>Ваш браузер не поддерживает воспроизведение видео.</p>
      </video>
      {title && <div className="video-title">{title}</div>}
    </div>
  );
}