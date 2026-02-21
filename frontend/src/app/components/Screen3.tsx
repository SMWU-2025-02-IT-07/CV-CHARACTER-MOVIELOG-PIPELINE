// src/app/components/Screen3.tsx

import { Loader2, Sparkles, Film, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { AIService } from "@/services/ai.service";
import { Button } from "@/app/components/ui/button";

interface Screen3Props {
  onComplete: () => void;
}

export function Screen3({ onComplete }: Screen3Props) {
  const { scenes, characterData, scenarioId, setScenes, setFinalVideoUrl } = useAppContext();
  const [sceneStatuses, setSceneStatuses] = useState<{
    [key: number]: 'pending' | 'generating' | 'completed' | 'error'
  }>({});
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);
  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    const initialStatuses: { [key: number]: 'pending' | 'generating' | 'completed' | 'error' } = {};
    scenes.forEach(scene => { initialStatuses[scene.id] = 'pending'; });
    setSceneStatuses(initialStatuses);
    generateAllScenes();
  }, []);

  const generateAllScenes = async () => {
    const updatedScenes = [...scenes];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      setSceneStatuses(prev => ({ ...prev, [scene.id]: 'generating' }));
      try {
        const videoUrl = await AIService.generateSceneVideo(scene.id, scene.description, characterData.imageUrl, scenarioId);
        updatedScenes[i] = { ...updatedScenes[i], videoUrl };
        setScenes(updatedScenes);
        setSceneStatuses(prev => ({ ...prev, [scene.id]: 'completed' }));
      } catch (error) {
        setSceneStatuses(prev => ({ ...prev, [scene.id]: 'error' }));
      }
    }
    setAllCompleted(true);
  };

  const regenerateScene = async (sceneId: number) => {
    setRegeneratingScene(sceneId);
    setSceneStatuses(prev => ({ ...prev, [sceneId]: 'generating' }));
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;
    try {
      const videoUrl = await AIService.generateSceneVideo(sceneId, scenes[sceneIndex].description, characterData.imageUrl, scenarioId);
      const updatedScenes = [...scenes];
      updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], videoUrl };
      setScenes(updatedScenes);
      setSceneStatuses(prev => ({ ...prev, [sceneId]: 'completed' }));
    } catch (error) {
      setSceneStatuses(prev => ({ ...prev, [sceneId]: 'error' }));
    } finally {
      setRegeneratingScene(null);
    }
  };

  const handleMergeAndComplete = async () => {
    try {
      const videoUrls = scenes.map(scene => scene.videoUrl).filter((url): url is string => !!url);
      if (videoUrls.length === 0) { alert('?앹꽦???곸긽???놁뒿?덈떎.'); return; }
      const finalUrl = await AIService.mergeVideos(videoUrls);
      setFinalVideoUrl(finalUrl);
      onComplete();
    } catch (error) {
      alert('?곸긽 蹂묓빀???ㅽ뙣?덉뒿?덈떎.');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { label: 'COMPLETE', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#6ee7b7', dot: '#10b981' };
      case 'generating': return { label: 'RENDERING', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.35)', color: '#c4b5fd', dot: 'var(--accent-violet)', pulse: true };
      case 'error': return { label: 'ERROR', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#fca5a5', dot: '#ef4444' };
      default: return { label: 'PENDING', bg: 'rgba(100,100,120,0.08)', border: 'rgba(100,100,120,0.2)', color: 'var(--text-muted)', dot: 'var(--text-muted)' };
    }
  };

  const completedCount = Object.values(sceneStatuses).filter(s => s === 'completed').length;
  const totalCount = scenes.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 relative z-10">

      {/* Header */}
      <div className="fade-up fade-up-1" style={{ marginBottom: '1.75rem' }}>
        <div className="eyebrow" style={{ marginBottom: '0.75rem' }}>Scene Rendering</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
          ?λ㈃蹂?<span className="gradient-brand-text">?곸긽 ?앹꽦</span> 以?        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          媛??λ㈃???곸긽???뺤씤?섍퀬 留덉쓬???ㅼ? ?딆쑝硫??ъ깮?깊븷 ???덉뒿?덈떎
        </p>
      </div>

      {/* Overall Progress */}
      <div className="cinema-card fade-up fade-up-2" style={{ marginBottom: '1.25rem', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            OVERALL PROGRESS
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-accent)', fontWeight: 700 }}>
            {completedCount} / {totalCount}
          </span>
        </div>
        <div className="cinema-progress-track">
          <div className="cinema-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          {['pending', 'generating', 'completed', 'error'].map(status => {
            const count = Object.values(sceneStatuses).filter(s => s === status).length;
            if (count === 0) return null;
            const cfg = getStatusConfig(status);
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {count} {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {scenes.map((scene, index) => {
          const status = sceneStatuses[scene.id] || 'pending';
          const cfg = getStatusConfig(status);
          return (
            <div
              key={scene.id}
              className={`cinema-card fade-up`}
              style={{ animationDelay: `${0.1 + index * 0.1}s`, opacity: 0 }}
            >
              {/* Card Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 18px', borderBottom: '1px solid var(--glass-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="scene-badge">{scene.title || `SCENE ${scene.id}`}</span>
                  {/* Status badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '3px 9px', borderRadius: '999px',
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                    color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    <span style={{
                      width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot,
                      animation: (cfg as any).pulse ? 'pulse-dot 1.5s infinite' : 'none',
                    }} />
                    {cfg.label}
                  </span>
                </div>
                {status === 'completed' && (
                  <button
                    onClick={() => regenerateScene(scene.id)}
                    disabled={regeneratingScene === scene.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 10px', borderRadius: 'calc(var(--radius) - 4px)',
                      background: 'transparent', border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}
                  >
                    <RefreshCw size={11} style={{ animation: regeneratingScene === scene.id ? 'spin 0.8s linear infinite' : 'none' }} />
                    REDO
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', alignItems: 'center' }}>
                {/* Video Area */}
                <div style={{
                  aspectRatio: '16/9',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  overflow: 'hidden',
                  background: 'var(--bg-void)',
                  border: '1px solid var(--glass-border)',
                  position: 'relative',
                }}>
                  {scene.videoUrl ? (
                    <video src={scene.videoUrl} className="w-full h-full" style={{ objectFit: 'cover' }} controls muted loop />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      {status === 'generating' ? (
                        <>
                          {/* Animated spinner */}
                          <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: '50%',
                              border: '1px solid rgba(124,58,237,0.2)',
                            }} />
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: '50%',
                              border: '2px solid transparent',
                              borderTopColor: 'var(--accent-violet)',
                              animation: 'spin 1s linear infinite',
                            }} />
                            <Film size={16} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--accent-purple)' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            RENDERING...
                          </span>
                        </>
                      ) : (
                        <>
                          <Film size={20} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            QUEUED
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Scene Info */}
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    DESCRIPTION
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {scene.description}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                    {[
                      { label: 'DURATION', value: scene.duration + '초' },
                      { label: 'SCENE', value: `#${scene.id}` },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-accent)', marginTop: '2px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Merge CTA or Loading notice */}
      {allCompleted ? (
        <div className="fade-up" style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-cinema-primary"
            onClick={handleMergeAndComplete}
            style={{
              padding: '0 36px', height: '54px',
              fontSize: '1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
              borderRadius: 'calc(var(--radius) * 1.2)',
            }}
          >
            <Sparkles size={18} />
            ?곸긽 蹂묓빀 諛??꾨즺
          </button>
        </div>
      ) : (
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius)',
          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            border: '2px solid transparent', borderTopColor: 'var(--accent-violet)',
            animation: 'spin 1s linear infinite',
          }} />
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ?곸긽???앹꽦?섍퀬 ?덉뒿?덈떎. ?좎떆留?湲곕떎?ㅼ＜?몄슂...
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
              {completedCount}/{totalCount} SCENES COMPLETE
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


