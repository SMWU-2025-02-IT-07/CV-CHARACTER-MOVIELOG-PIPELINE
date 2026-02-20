// src/app/components/Screen1.tsx

import { Upload, Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { StorageService } from "@/services/storage.service";
import { AIService } from "@/services/ai.service";
import { useState } from "react";

interface Screen1Props {
  onNext: () => void;
}

export function Screen1({ onNext }: Screen1Props) {
  const { characterData, setCharacterData, setScenes } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, image: '이미지 파일만 업로드 가능합니다.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, image: '파일 크기는 10MB 이하여야 합니다.' });
      return;
    }
    try {
      const imageUrl = await StorageService.uploadImage(file);
      setCharacterData({ ...characterData, image: file, imageUrl });
      setErrors({ ...errors, image: '' });
    } catch (error) {
      setErrors({ ...errors, image: '이미지 업로드에 실패했습니다.' });
    }
  };

  const handleRemoveImage = () => {
    setCharacterData({ ...characterData, image: null, imageUrl: '' });
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!characterData.imageUrl) newErrors.image = '캐릭터 이미지를 업로드해주세요.';
    if (!characterData.name.trim()) newErrors.name = '캐릭터 이름을 입력해주세요.';
    if (!characterData.who.trim()) newErrors.who = '누가를 입력해주세요.';
    if (!characterData.where.trim()) newErrors.where = '어디서를 입력해주세요.';
    if (!characterData.what.trim()) newErrors.what = '무엇을을 입력해주세요.';
    if (!characterData.how.trim()) newErrors.how = '어떻게를 입력해주세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateScenario = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const generatedScenes = await AIService.generateScenario(
        characterData.name, characterData.who, characterData.where,
        characterData.what, characterData.how, characterData.imageUrl
      );
      setScenes(generatedScenes);
      onNext();
    } catch (error) {
      setErrors({ ...errors, general: '시나리오 생성에 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { key: 'who', label: '누가', placeholder: '예: 눈송이가', hint: 'WHO' },
    { key: 'where', label: '어디서', placeholder: '예: 카페에서', hint: 'WHERE' },
    { key: 'what', label: '무엇을', placeholder: '예: 커피를 마시며', hint: 'WHAT' },
    { key: 'how', label: '어떻게', placeholder: '예: 노트북을 한다', hint: 'HOW' },
  ] as const;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 relative z-10">

      {/* Header */}
      <div className="mb-8 fade-up fade-up-1">
        <div className="eyebrow mb-3">AI Video Generation</div>
        <h1 className="text-display" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          캐릭터를 설정하고<br />
          <span className="gradient-brand-text">시나리오를 생성</span>하세요
        </h1>
        <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }}>
          AI가 3개의 장면으로 자동 구성합니다
        </p>
      </div>

      {/* Main Card */}
      <div className="cinema-card fade-up fade-up-2" style={{ overflow: 'visible' }}>
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Image Upload */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                CHARACTER IMAGE
              </label>
              {characterData.imageUrl && (
                <span className="status-badge status-badge-complete">LOADED</span>
              )}
            </div>

            <div
              className="gradient-border"
              style={{
                position: 'relative',
                aspectRatio: '1/1',
                maxHeight: '220px',
                borderRadius: 'calc(var(--radius) * 1.2)',
                overflow: 'hidden',
                cursor: 'pointer',
                background: characterData.imageUrl
                  ? `url(${characterData.imageUrl}) center/cover no-repeat`
                  : 'var(--bg-surface)',
                transition: 'all 0.3s ease',
              }}
            >
              <input
                type="file"
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                accept="image/*"
                onChange={handleImageUpload}
              />

              {characterData.imageUrl ? (
                <>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)', zIndex: 5 }} />
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveImage(); }}
                    style={{
                      position: 'absolute', top: '12px', right: '12px', zIndex: 20,
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '12px',
                  color: 'var(--text-muted)',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Upload size={20} style={{ color: 'var(--accent-purple)' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>드래그하거나 클릭하여 업로드</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>PNG · JPG · MAX 10MB</p>
                  </div>
                </div>
              )}
            </div>
            {errors.image && <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#f87171' }}>{errors.image}</p>}
          </div>

          {/* Divider */}
          <div className="divider-glow" />

          {/* Character Name */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              CHARACTER NAME
            </label>
            <div style={{ position: 'relative' }}>
              <Input
                type="text"
                placeholder="예: 눈송이"
                value={characterData.name}
                onChange={(e) => setCharacterData({ ...characterData, name: e.target.value })}
                style={{
                  height: '44px',
                  paddingLeft: '14px',
                  fontSize: '0.95rem',
                  background: 'var(--bg-surface)',
                  border: errors.name ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--glass-border)',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            {errors.name && <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#f87171' }}>{errors.name}</p>}
          </div>

          {/* Scenario Inputs */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.875rem' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                SCENARIO SETUP
              </label>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {fields.map((field) => (
                <div key={field.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--accent-purple)', fontWeight: 700, letterSpacing: '0.1em' }}>{field.hint}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{field.label}</span>
                  </div>
                  <Input
                    placeholder={field.placeholder}
                    value={characterData[field.key]}
                    onChange={(e) => setCharacterData({ ...characterData, [field.key]: e.target.value })}
                    style={{
                      height: '40px',
                      fontSize: '0.85rem',
                      background: 'var(--bg-surface)',
                      border: errors[field.key] ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--glass-border)',
                      borderRadius: 'calc(var(--radius) - 2px)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {errors[field.key] && <p style={{ marginTop: '4px', fontSize: '0.7rem', color: '#f87171' }}>{errors[field.key]}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {errors.general && (
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: '0.8rem', color: '#f87171',
            }}>
              {errors.general}
            </div>
          )}

          {/* CTA Button */}
          <button
            className="btn-cinema-primary"
            onClick={handleGenerateScenario}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '52px',
              fontSize: '0.95rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {isLoading ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                시나리오 생성 중...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                시나리오 생성하기
                <ChevronRight size={16} style={{ marginLeft: '2px' }} />
              </>
            )}
          </button>

        </div>
      </div>

      {/* Info Footer */}
      <div className="fade-up fade-up-3" style={{
        marginTop: '1rem',
        padding: '14px 16px',
        borderRadius: 'var(--radius)',
        background: 'rgba(124, 58, 237, 0.05)',
        border: '1px solid rgba(124, 58, 237, 0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-purple)', fontWeight: 700,
        }}>i</div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            AI가 자동으로 <span style={{ color: 'var(--text-accent)' }}>3개의 장면</span>으로 시나리오를 구성합니다
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            생성 후 각 장면을 수정하거나 재생성할 수 있습니다
          </p>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}