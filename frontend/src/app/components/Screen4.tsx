// src/app/components/Screen4.tsx

import { Play, Download, Share2, RefreshCw, Sparkles, Pause, SkipForward, SkipBack, CheckCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";

interface Screen4Props {
  onReset: () => void;
  onRestart: () => void;
}

interface Playlist {
  videos: string[];
  currentIndex: number;
  isPlaylist: boolean;
}

export function Screen4({ onReset, onRestart }: Screen4Props) {
  const { finalVideoUrl, resetAll } = useAppContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (finalVideoUrl && finalVideoUrl.startsWith('playlist:')) {
      try {
        const playlistData = JSON.parse(finalVideoUrl.replace('playlist:', ''));
        setPlaylist(playlistData);
        setCurrentVideoIndex(0);
      } catch (error) {
        console.error('Failed to parse playlist:', error);
      }
    }
  }, [finalVideoUrl]);

  const getCurrentVideoUrl = () => {
    if (playlist && playlist.videos[currentVideoIndex]) return playlist.videos[currentVideoIndex];
    return finalVideoUrl;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoEnded = () => {
    if (playlist && currentVideoIndex < playlist.videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleNextVideo = () => {
    if (playlist && currentVideoIndex < playlist.videos.length - 1) setCurrentVideoIndex(prev => prev + 1);
  };

  const handlePrevVideo = () => {
    if (playlist && currentVideoIndex > 0) setCurrentVideoIndex(prev => prev - 1);
  };

  useEffect(() => {
    if (videoRef.current && playlist) {
      videoRef.current.load();
      if (isPlaying) videoRef.current.play();
    }
  }, [currentVideoIndex, playlist]);

  const handleDownload = () => alert('다운로드 기능은 AWS 배포 시 구현됩니다.');

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'AI 생성 영상', text: '제가 만든 AI 영상을 확인해보세요!', url: finalVideoUrl }).catch(console.error);
    } else {
      alert('공유 기능은 지원하지 않는 브라우저입니다.');
    }
  };

  const handleRestart = () => { resetAll(); onRestart(); };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 relative z-10">

      {/* Header */}
      <div className="fade-up fade-up-1" style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: '1rem' }}>
          <CheckCircle size={14} style={{ color: '#10b981' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: '#6ee7b7', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Generation Complete
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          멋진 영상이 <span className="gradient-brand-text">완성</span>되었습니다
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          영상을 확인하고 다운로드하거나 공유해보세요
        </p>
      </div>

      {/* Video Player */}
      <div className="cinema-card fade-up fade-up-2" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
        {/* Accent top bar */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-blue))' }} />

        <div style={{ padding: '1.25rem' }}>
          {/* Video */}
          <div
            className="cinema-video-wrapper"
            style={{ position: 'relative', aspectRatio: '16/9', cursor: 'pointer', marginBottom: '1rem' }}
            onClick={handlePlayPause}
          >
            {getCurrentVideoUrl() ? (
              <>
                <video
                  ref={videoRef}
                  src={getCurrentVideoUrl()}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Play/Pause overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'opacity 0.3s ease',
                  opacity: isPlaying ? 0 : 1,
                  background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.3)',
                }}>
                  {/* Pulse rings */}
                  {!isPlaying && (
                    <>
                      <div style={{ position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', border: '1px solid rgba(124,58,237,0.3)', animation: 'ping 2s infinite' }} />
                      <div style={{ position: 'absolute', width: '64px', height: '64px', borderRadius: '50%', border: '1px solid rgba(124,58,237,0.2)', animation: 'ping 2s 0.5s infinite' }} />
                    </>
                  )}
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2, boxShadow: '0 0 30px rgba(124,58,237,0.3)',
                  }}>
                    {isPlaying
                      ? <Pause size={22} style={{ color: 'white' }} />
                      : <Play size={22} style={{ color: 'white', marginLeft: '2px' }} />
                    }
                  </div>
                </div>

                {/* Controls overlay */}
                <div style={{
                  position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                  opacity: 0, transition: 'opacity 0.25s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {playlist && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handlePrevVideo(); }} disabled={currentVideoIndex === 0}
                          style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', opacity: currentVideoIndex === 0 ? 0.4 : 1 }}>
                          <SkipBack size={14} style={{ color: 'white' }} />
                        </button>
                        <div style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'white' }}>
                          {currentVideoIndex + 1} / {playlist.videos.length}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleNextVideo(); }} disabled={currentVideoIndex === playlist.videos.length - 1}
                          style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', opacity: currentVideoIndex === playlist.videos.length - 1 ? 0.4 : 1 }}>
                          <SkipForward size={14} style={{ color: 'white' }} />
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'white' }}>
                    1080p
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading...</p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { icon: <Download size={14} />, label: '다운로드', onClick: handleDownload },
              { icon: <Share2 size={14} />, label: '공유하기', onClick: handleShare },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                  background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)', fontSize: '0.82rem',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* Stats Strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            background: 'var(--bg-surface)', borderRadius: 'var(--radius)',
            border: '1px solid var(--glass-border)', overflow: 'hidden',
          }}>
            {[
              { value: '12초', label: 'DURATION' },
              { value: '3컷', label: 'SCENES' },
              { value: '1080p', label: 'QUALITY' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                padding: '14px 0', textAlign: 'center',
                borderRight: i < 2 ? '1px solid var(--glass-border)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-accent)' }}>{stat.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '3px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fade-up fade-up-3" style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          onClick={onReset}
          style={{
            flex: 1, minWidth: '140px', height: '48px',
            background: 'transparent', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius)', color: 'var(--text-secondary)',
            fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          <RefreshCw size={15} />
          다시 만들기
        </button>
        <button
          className="btn-cinema-primary"
          onClick={handleRestart}
          style={{
            flex: 2, minWidth: '180px', height: '48px',
            fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em',
          }}
        >
          <Sparkles size={16} />
          새로운 영상 만들기
        </button>
      </div>

      {/* Success note */}
      <div className="fade-up fade-up-4" style={{
        padding: '14px 18px', borderRadius: 'var(--radius)',
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={13} style={{ color: '#10b981' }} />
        </div>
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            고품질 AI 영상이 성공적으로 생성되었습니다
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
            영상은 자동으로 저장되며 언제든지 다시 확인할 수 있습니다
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          0%  { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}