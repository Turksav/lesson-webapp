'use client';

import { useEffect, useState } from 'react';

interface VideoPlayerProps {
  kinescopeVideoId: string;
  title?: string;
}

interface KinescopeVideoData {
  embedUrl: string;
  videoId: string;
  title: string;
  duration: number;
  thumbnail: string | null;
  status: string;
}

export default function VideoPlayer({ kinescopeVideoId, title }: VideoPlayerProps) {
  const [videoData, setVideoData] = useState<KinescopeVideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const getKinescopeVideo = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('Requesting Kinescope video for ID:', kinescopeVideoId);
        console.log('Making request to:', '/api/get-video-url');
        
        const response = await fetch('/api/get-video-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId: kinescopeVideoId }),
        });
        
        if (response.status === 202) {
          // Video is still processing
          const data = await response.json();
          console.log('Video is processing, status:', data.status);
          setError(`Видео обрабатывается (статус: ${data.status}). Попробуйте позже.`);
          
          // Retry after 5 seconds, max 3 retries
          if (retryCount < 3) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 5000);
            return;
          }
        } else if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        } else {
          const data: KinescopeVideoData = await response.json();
          console.log('Received Kinescope video data:', data.title);
          setVideoData(data);
          setRetryCount(0); // Reset retry count on success
        }
        
      } catch (err: any) {
        console.error('Error getting Kinescope video:', err);
        console.error('Error details:', err.message);
        setError(`Не удалось загрузить видео: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (kinescopeVideoId) {
      getKinescopeVideo();
    } else {
      setLoading(false);
      setError('Kinescope Video ID не указан');
    }
  }, [kinescopeVideoId, retryCount]);

  if (loading) {
    return (
      <div className="video-player-container">
        <div className="video-placeholder loading">
          <div className="video-placeholder-content">
            <div className="spinner"></div>
            <p>
              {retryCount > 0 
                ? `Загружаем видео... (попытка ${retryCount + 1}/4)`
                : 'Загружаем видео...'
              }
            </p>
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
            <small>Video ID: {kinescopeVideoId}</small>
            {retryCount < 3 && error.includes('обрабатывается') && (
              <button 
                className="retry-button"
                onClick={() => setRetryCount(prev => prev + 1)}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Повторить попытку
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="video-player-container">
        <div className="video-placeholder">
          <div className="video-placeholder-content">
            <div className="video-placeholder-icon">🎬</div>
            <p>Видео недоступно</p>
            <small>Video ID: {kinescopeVideoId}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <div className="kinescope-player-wrapper">
        <iframe
          src={videoData.embedUrl}
          className="kinescope-player"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          frameBorder="0"
          title={title || videoData.title || 'Видео урока'}
        />
      </div>
      {(title || videoData.title) && (
        <div className="video-title">{title || videoData.title}</div>
      )}
      {videoData.duration > 0 && (
        <div className="video-meta">
          <span className="video-duration">
            Длительность: {Math.floor(videoData.duration / 60)}:{String(videoData.duration % 60).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
}