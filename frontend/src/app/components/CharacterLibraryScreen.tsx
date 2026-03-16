import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, PlusCircle, CheckCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { CharacterProfile, CharacterProfileInput } from '@/services/character.service';
import { StorageService } from '@/services/storage.service';

const EMPTY_FORM: CharacterProfileInput = {
  name: '',
  imageUrl: '',
};

export function CharacterLibraryScreen() {
  const navigate = useNavigate();
  const {
    characters,
    loadCharacters,
    saveCharacter,
    deleteCharacter,
    setCharacterData,
  } = useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [editing, setEditing] = useState<CharacterProfile | null>(null);
  const [form, setForm] = useState<CharacterProfileInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleSelectCharacter = (character: CharacterProfile) => {
    setCharacterData((prev) => ({
      ...prev,
      name: character.name,
      image: null,
      imageUrl: character.imageUrl,
    }));
    navigate('/create');
  };

  const validate = () => {
    const nextErrors: { [key: string]: string } = {};
    if (!form.imageUrl) nextErrors.imageUrl = '캐릭터 이미지를 업로드해주세요.';
    if (!form.name.trim()) nextErrors.name = '캐릭터 이름을 입력해주세요.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload: CharacterProfileInput & Partial<Pick<CharacterProfile, 'id'>> = {
        ...form,
        id: editing?.id,
      };
      await saveCharacter(payload);
      await loadCharacters();
      setShowForm(false);
      resetForm();
    } catch (error) {
      setErrors({ ...errors, general: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 캐릭터를 삭제하시겠습니까?')) return;
    setIsLoading(true);
    try {
      await deleteCharacter(id);
    } finally {
      setIsLoading(false);
    }
  };

  const onUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, imageUrl: '이미지 파일만 업로드 가능합니다.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, imageUrl: '파일 크기는 10MB 이하여야 합니다.' });
      return;
    }

    try {
      const dataUrl = await StorageService.uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      setErrors((prev) => ({ ...prev, imageUrl: '' }));
    } catch (err) {
      setErrors({ ...errors, imageUrl: '이미지 업로드에 실패했습니다.' });
    }
  };

  const isEditing = Boolean(editing);

  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [characters]);

  return (
    <><div className="w-full max-w-3xl mx-auto px-4 py-8 relative z-10">
          <div className="mb-10">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                      <div className="eyebrow" style={{margin: '20px'}} >CHARACTER LIBRARY</div>
                      <h1 className="text-display" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                          저장된 캐릭터를 관리하고 불러오기
                      </h1>
                      <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }}>
                          선택한 캐릭터는 자동으로 Create 단계의 캐릭터 설정에 반영됩니다.
                      </p>
                  </div>
                  <button
                      className="btn-outline"
                      style={{ height: 44, padding: '0 1.2rem' }}
                      onClick={() => navigate('/')}
                  >
                      홈으로
                  </button>
              </div>
          </div>

          <div className="cinema-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          저장된 캐릭터
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                          자주 쓰는 캐릭터를 저장해두고 /create 단계에서 빠르게 불러올 수 있습니다.
                      </p>
                  </div>

                  <button
                      className="btn-primary"
                      style={{ height: 44, padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => {
                          setShowForm(true);
                          resetForm();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                      } }
                  >
                      <PlusCircle size={16} /> 새 캐릭터 추가
                  </button>
              </div>

              {sortedCharacters.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      저장된 캐릭터가 없습니다. 아래 폼을 작성하고 저장해보세요.
                  </div>
              ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      {sortedCharacters.map((character) => (
                          <div key={character.id} className="glass" style={{ padding: '1rem', borderRadius: '16px', position: 'relative' }}>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                  <div
                                      style={{
                                          width: 60,
                                          height: 60,
                                          borderRadius: 16,
                                          background: `url(${character.imageUrl}) center/cover no-repeat`,
                                          flexShrink: 0,
                                          border: '1px solid rgba(255,255,255,0.08)',
                                      }} />
                                  <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                          {character.name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                          {new Date(character.createdAt).toLocaleDateString()} 등록
                                      </div>
                                  </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                  <button
                                      className="btn-outline"
                                      style={{ flex: 1, height: 38, fontSize: '0.8rem' }}
                                      onClick={() => handleSelectCharacter(character)}
                                  >
                                      불러오기
                                  </button>
                                  <button
                                      className="btn-outline"
                                      style={{ flex: 1, height: 38, fontSize: '0.8rem' }}
                                      onClick={() => {
                                          setShowForm(true);
                                          setEditing(character);
                                          setForm({
                                              name: character.name,
                                              imageUrl: character.imageUrl,
                                          });
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                      } }
                                  >
                                      편집
                                  </button>
                                  <button
                                      className="btn-outline"
                                      style={{ flex: 1, height: 38, fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.5)' }}
                                      onClick={() => handleDelete(character.id)}
                                  >
                                      삭제
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {showForm && (
          <div className="cinema-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          {isEditing ? '캐릭터 수정' : '새 캐릭터 저장'}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                          캐릭터 정보를 저장하면 언제든 이 페이지에서 불러올 수 있습니다.
                      </p>
                  </div>
                  <button
                      className="btn-outline"
                      style={{ height: 38, padding: '0 1rem' }}
                      onClick={() => {
                          resetForm();
                          setShowForm(false);
                      }}
                  >
                      <X size={14}/>
                  </button>
              </div>

              <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          CHARACTER IMAGE
                      </label>
                      <div
                          className="gradient-border"
                          style={{
                              position: 'relative',
                              aspectRatio: '1/1',
                              maxHeight: '220px',
                              borderRadius: 'calc(var(--radius) * 1.2)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              background: form.imageUrl
                                  ? `url(${form.imageUrl}) center/cover no-repeat`
                                  : 'var(--bg-surface)',
                              transition: 'all 0.3s ease',
                          }}
                      >
                          <input
                              type="file"
                              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                              accept="image/*"
                              onChange={onUploadImage} />

                          {form.imageUrl ? (
                              <>
                                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)', zIndex: 5 }} />
                                  <button
                                      onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setForm((prev) => ({ ...prev, imageUrl: '' }));
                                      } }
                                      style={{
                                          position: 'absolute',
                                          top: '12px',
                                          right: '12px',
                                          zIndex: 20,
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          background: 'rgba(0,0,0,0.7)',
                                          border: '1px solid rgba(255,255,255,0.15)',
                                          color: 'white',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'background 0.2s ease',
                                      }}
                                  >
                                      <X size={14} />
                                  </button>
                              </>
                          ) : (
                              <div
                                  style={{
                                      position: 'absolute',
                                      inset: 0,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '12px',
                                      color: 'var(--text-muted)',
                                  }}
                              >
                                  <div
                                      style={{
                                          width: '48px',
                                          height: '48px',
                                          borderRadius: '50%',
                                          border: '1px solid var(--glass-border)',
                                          background: 'var(--bg-elevated)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                      }}
                                  >
                                      <PlusCircle size={20} style={{ color: 'var(--accent-purple)' }} />
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>드래그하거나 클릭하여 업로드</p>
                                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                                          PNG · JPG · MAX 10MB
                                      </p>
                                  </div>
                              </div>
                          )}
                      </div>
                      {errors.imageUrl && <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#f87171' }}>{errors.imageUrl}</p>}
                  </div>

                  <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                          CHARACTER NAME
                      </label>
                      <input
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="예: 눈송이"
                          style={{
                              width: '100%',
                              height: '44px',
                              paddingLeft: '14px',
                              fontSize: '0.95rem',
                              background: 'var(--bg-surface)',
                              border: errors.name ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--glass-border)',
                              borderRadius: 'calc(var(--radius) - 2px)',
                              color: 'var(--text-primary)',
                          }} />
                      {errors.name && <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#f87171' }}>{errors.name}</p>}
                  </div>
              </div>

              {errors.general && (
                  <div
                      style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius)',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          fontSize: '0.8rem',
                          color: '#f87171',
                      }}
                  >
                      {errors.general}
                  </div>
              )}

              <button
                  className="btn-cinema-primary"
                  onClick={handleSave}
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
                          <span
                              style={{
                                  width: '16px',
                                  height: '16px',
                                  border: '2px solid rgba(255,255,255,0.3)',
                                  borderTopColor: 'white',
                                  borderRadius: '50%',
                                  animation: 'spin 0.8s linear infinite',
                                  display: 'inline-block',
                              }} />
                          저장 중...
                      </>
                  ) : (
                      <>
                          <CheckCircle size={16} />
                          {isEditing ? '저장하기' : '저장하기'}
                      </>
                  )}
              </button>
          </div>
          )}
      </div><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></>
  );
}
