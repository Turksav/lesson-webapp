'use client';

import Script from 'next/script';

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

  return (
    <div className="video-player-container">
      <div
        id={`kinescope-popup-${kinescopeVideoId}`}
        className="kinescope-popup-wrapper"
      >
        <Script
          src={`https://kinescope.io/${kinescopeVideoId}/popup.js?aspect_ratio=9/16`}
          strategy="afterInteractive"
          key={kinescopeVideoId}
        />
      </div>
      {title && (
        <div className="video-title">{title}</div>
      )}
    </div>
  );
}
