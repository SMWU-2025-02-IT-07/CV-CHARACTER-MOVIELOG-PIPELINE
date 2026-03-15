// src/app/components/Screen4.tsx

import { Play, Download, Share2, RefreshCw, Sparkles, Pause, SkipForward, SkipBack, CheckCircle, Mic } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { SafeVideoPlayer } from "@/app/components/SafeVideoPlayer";
import { useNavigate } from "react-router-dom";
import { AIService } from "@/services/ai.service";

interface Playlist {
  videos: string[];
  currentIndex: number;
  isPlaylist: boolean;
}

export function Screen4() {
  const navigate = useNavigate();
  const { finalVideoUrl, resetAll, scenarioId, scenes } = useAppContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // TTS 상태
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string>('');
  
  // 최종 병합 상태
  const [finalMergeStatus, setFinalMergeStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [finalMergeProgress, setFinalMergeProgress] = useState(0);
  const [finalVideoWithAudioUrl, setFinalVideoWithAudioUrl] = useState<string>('');

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

  const handleDownload = () => {
    const downloadUrl = finalVideoWithAudioUrl || finalVideoUrl;
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video_${scenarioId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('다운로드할 영상이 없습니다.');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'AI 생성 영상', text: '제가 만든 AI 영상을 확인해보세요!', url: finalVideoUrl }).catch(console.error);
    } else {
      alert('공유 기능은 지원하지 않는 브라우저입니다.');
    }
  };

  const handleRestart = () => {
    resetAll();
    navigate("/create");
  };

  // TTS 음성 생성
  const handleGenerateTTS = async () => {
    try {
      setTtsStatus('generating');
      
      // 모든 씨 설명을 합쳐서 하나의 텍스트로 만들기
      const narrationText = scenes.map(scene => scene.description).join(' ');
      
      const audioUrl = await AIService.generateTTS(scenarioId, narrationText, {
        onStatusChange: (status) => {
          setTtsStatus(status);
        }
      });
      
      setTtsAudioUrl(audioUrl);
      setTtsStatus('completed');
      
    } catch (error) {
      console.error('TTS generation error:', error);
      setTtsStatus('error');
      alert('음성 생성에 실패했습니다.');
    }
  };

  // 최종 영상+음성 병합
  const handleFinalMerge = async () => {
    try {
      setFinalMergeStatus('processing');
      setFinalMergeProgress(0);
      
      const finalUrl = await AIService.mergeFinalVideo(scenarioId, {
        onStatusChange: (status, progress) => {
          if (progress !== undefined) {
            setFinalMergeProgress(progress);
          }
          if (status === 'completed') {
            setFinalMergeStatus('completed');
          } else if (status === 'error') {
            setFinalMergeStatus('error');
          }
        }
      });
      
      setFinalVideoWithAudioUrl(finalUrl);
      setFinalMergeStatus('completed');
      
    } catch (error) {
      console.error('Final merge error:', error);
      setFinalMergeStatus('error');
      alert('최종 병합에 실패했습니다.');
    }
  };

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
              <SafeVideoPlayer
                src={finalVideoWithAudioUrl || getCurrentVideoUrl()}
                style={{ width: '100%', height: '100%', borderRadius: 'calc(var(--radius) - 2px)' }}
                onError={(error) => {
                  console.error('Final video playback error:', error);
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading...</p>
              </div>
            )}
          </div>

          {/* TTS 및 최종 병합 버튼 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {/* TTS 생성 버튼 */}
            {ttsStatus === 'idle' && (
              <button
                onClick={handleGenerateTTS}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                  color: 'var(--accent-violet)', fontSize: '0.82rem',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Mic size={14} />
                음성 합성
              </button>
            )}
            
            {ttsStatus === 'generating' && (
              <button
                disabled
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                  color: 'var(--accent-violet)', fontSize: '0.82rem',
                  fontFamily: 'var(--font-body)', cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                <div style={{ width: '14px', height: '14px', border: '2px solid transparent', borderTopColor: 'var(--accent-violet)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                음성 생성 중...
              </button>
            )}
            
            {ttsStatus === 'completed' && finalMergeStatus === 'idle' && (
              <button
                onClick={handleFinalMerge}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10b981', fontSize: '0.82rem',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={14} />
                음성 병합
              </button>
            )}
            
            {finalMergeStatus === 'processing' && (
              <button
                disabled
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10b981', fontSize: '0.82rem',
                  fontFamily: 'var(--font-body)', cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                <div style={{ width: '14px', height: '14px', border: '2px solid transparent', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                병합 중... {finalMergeProgress}%
              </button>
            )}
            
            {finalMergeStatus === 'completed' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981', fontSize: '0.82rem',
                fontFamily: 'var(--font-body)',
              }}>
                <CheckCircle size={14} />
                음성 병합 완료
              </div>
            )}

            {/* 다운로드 버튼 */}
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)', fontSize: '0.82rem',
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              <Download size={14} />
              다운로드
            </button>
            
            {/* 공유 버튼 */}
            <button
              onClick={handleShare}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'calc(var(--radius) - 2px)',
                background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)', fontSize: '0.82rem',
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              <Share2 size={14} />
              공유하기
            </button>
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
          onClick={() => navigate("/scenario")}
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
