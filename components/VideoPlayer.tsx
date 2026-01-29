'use client';

interface VideoPlayerProps {
  kinescopeVideoId: string;
  title?: string;
}

export default function VideoPlayer({ kinescopeVideoId, title }: VideoPlayerProps) {
  if (!kinescopeVideoId) {
    return (
      <div className="video-player-container">
        <div className="video-placeholder error">
          <div className="video-placeholder-content">
            <div className="video-error-icon">📹</div>
            <p>Kinescope Video ID не указан</p>
          </div>
        </div>
      </div>
    );
  }

  const embedUrl = `https://kinescope.io/embed/${kinescopeVideoId}`;

  return (
    <div className="video-player-container">
      <div className="kinescope-player-wrapper">
        <iframe
          src={embedUrl}
          className="kinescope-player"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
          frameBorder="0"
          title={title || 'Видео урока'}
        />
      </div>
      {title && (
        <div className="video-title">{title}</div>
      )}
    </div>
  );
}
