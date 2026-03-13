import React, { useState, useRef, useEffect } from 'react';
import { Play, AlertCircle, RefreshCw } from 'lucide-react';

interface SafeVideoPlayerProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: any) => void;
}

export function SafeVideoPlayer({ src, className, style, onError }: SafeVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setCanPlay(false);
  }, [src]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setCanPlay(true);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const error = video.error;
    
    let errorMessage = 'Video playback failed';
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video decoding failed';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    console.error('Video error details:', errorMessage, error);
    setIsLoading(false);
    setHasError(true);
    onError?.({ message: errorMessage, originalError: e });
  };

  const handleRetry = () => {
    if (videoRef.current) {
      setHasError(false);
      setIsLoading(true);
      videoRef.current.load();
    }
  };

  if (hasError) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(239,68,68,0.3)',
        }}
      >
        <AlertCircle size={24} style={{ color: '#ef4444' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '0.8rem', 
            color: '#fca5a5', 
            marginBottom: '8px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Video Load Error
          </p>
          <button
            onClick={handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'calc(var(--radius) - 2px)',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, position: 'relative' }}>
      <video
        ref={videoRef}
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        controls
        muted
        loop
        preload="metadata"
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onLoadedData={() => setIsLoading(false)}
      />
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid transparent',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'white',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Loading...
          </span>
        </div>
      )}
      
      {!canPlay && !isLoading && !hasError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <Play size={48} style={{ color: 'white', opacity: 0.8 }} />
        </div>
      )}
    </div>
  );
}