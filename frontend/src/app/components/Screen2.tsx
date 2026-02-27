// src/app/components/Screen2.tsx

import { Edit3, Play, RefreshCw, Check, X, Clock } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { AIService } from "@/services/ai.service";
import { useEffect, useMemo, useRef, useState } from "react";

interface Screen2Props {
  onEdit: () => void;
  onNext: () => void;
}

export function Screen2({ onEdit, onNext }: Screen2Props) {
  const { scenes, setScenes, characterData, scenarioId, setScenarioId } = useAppContext();

  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ✅ "마지막으로 서버에서 받은 scenes"를 기준(baseline)으로 저장
  // - 변경사항(dirty) 여부 판단
  // - '영상 생성하기' 클릭 시 dirty면 regenerate를 먼저 수행
  // - 'REGENERATE ALL'은 '전부 마음에 안 들 때' 리셋 용도 (현재 수정사항 무시)
  const baselineScenesRef = useRef<typeof scenes>([]);

  // 최초 진입/데이터 로딩 시 baseline 설정(아직 없을 때만)
  useEffect(() => {
    if (baselineScenesRef.current.length === 0 && scenes.length > 0) {
      baselineScenesRef.current = scenes;
    }
  }, [scenes]);

  // ✅ 변경사항 카운트
  const dirtyInfo = useMemo(() => {
    const base = baselineScenesRef.current;
    const baseMap = new Map<number, string>();
    base.forEach((s) => baseMap.set(s.id, s.description));

    const dirtyIds: number[] = [];
    for (const s of scenes) {
      const baseDesc = baseMap.get(s.id);
      if (baseDesc !== undefined && baseDesc !== s.description) dirtyIds.push(s.id);
    }

    return {
      dirtyIds,
      dirtyCount: dirtyIds.length,
    };
  }, [scenes]);

  const handleEditScene = (sceneId: number, description: string) => {
    setEditingSceneId(sceneId);
    setEditedDescription(description);
  };

  const handleSaveEdit = () => {
    if (editingSceneId) {
      setScenes(
        scenes.map((scene) =>
          scene.id === editingSceneId ? { ...scene, description: editedDescription } : scene
        )
      );
      setEditingSceneId(null);
      setEditedDescription("");
    }
  };

  const handleCancelEdit = () => {
    setEditingSceneId(null);
    setEditedDescription("");
  };

  /**
   * ✅ (유지) REGENERATE ALL
   * - "3개 다 맘에 안 들면" 전체를 다시 만들기/리셋
   * - 현재 수정사항은 무시하고 baseline(마지막 서버 응답) 기준으로 regenerate
   */
  const handleRegenerateAll = async () => {
    if (!scenarioId) return;

    const ok = window.confirm(
      "전체 재생성을 실행할까요?\n- 현재 수정한 내용은 무시되고\n- 모든 장면을 다시 생성/갱신합니다."
    );
    if (!ok) return;

    setIsRegenerating(true);
    try {
      const base = baselineScenesRef.current.length > 0 ? baselineScenesRef.current : scenes;

      // 수정사항 무시: 화면도 기준으로 되돌림
      setScenes(base);

      const result = await AIService.regenerateScenario(
        scenarioId,
        base.map((s) => ({ id: s.id, description: s.description })),
        characterData.imageUrl
      );

      setScenarioId(result.scenarioId);
      setScenes(result.scenes);

      // 새 결과가 baseline
      baselineScenesRef.current = result.scenes;
    } catch (error) {
      console.error("Regenerate all error:", error);
      alert("전체 재생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsRegenerating(false);
    }
  };

  /**
   * ✅ 영상 생성하기 버튼 클릭 시:
   * - 변경사항(dirty)이 있으면 regenerate 먼저 수행(= image_prompt 업데이트)
   * - 그 다음 onNext()로 진행
   */
  const handleGenerateVideoClick = async () => {
    if (!scenarioId) {
      alert("scenarioId가 없습니다. 다시 시도해주세요.");
      return;
    }

    // 편집 중이면 저장/취소 유도
    if (editingSceneId !== null) {
      const ok = window.confirm("편집 중인 장면이 있습니다. 저장하지 않고 진행할까요?");
      if (!ok) return;
      // 저장하지 않고 진행할 경우 편집 상태만 종료
      setEditingSceneId(null);
      setEditedDescription("");
    }

    // 변경사항이 있으면 먼저 regenerate
    if (dirtyInfo.dirtyCount > 0) {
      setIsRegenerating(true);
      try {
        const result = await AIService.regenerateScenario(
          scenarioId,
          scenes.map((s) => ({ id: s.id, description: s.description })),
          characterData.imageUrl
        );

        setScenarioId(result.scenarioId);
        setScenes(result.scenes);

        // 적용 완료 후 baseline 갱신(변경사항 0개로)
        baselineScenesRef.current = result.scenes;
      } catch (error) {
        console.error("Auto-regenerate before render error:", error);
        alert("수정사항 반영(프롬프트 업데이트)에 실패했습니다. 다시 시도해주세요.");
        return; // regenerate 실패하면 영상 생성 단계로 넘어가지 않음
      } finally {
        setIsRegenerating(false);
      }
    }

    // 다음 단계로 이동(영상 생성 플로우)
    onNext();
  };

  const isRegenAllDisabled = isRegenerating || !scenarioId;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 relative z-10">
      {/* Header */}
      <div className="fade-up fade-up-1" style={{ marginBottom: "1.75rem" }}>
        <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>
          Scenario Preview
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              시나리오 <span className="gradient-brand-text">미리보기</span>
            </h1>

            <p style={{ marginTop: "6px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              각 장면을 확인하고 수정할 수 있습니다
            </p>

            {/* ✅ 안내 문구: 사용자가 오해하지 않게 */}
            <p style={{ marginTop: "6px", color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.4 }}>
              수정한 장면은 저장되며, <b style={{ color: "var(--text-secondary)" }}>영상 생성</b> 시 자동으로 반영됩니다
              {dirtyInfo.dirtyCount > 0 ? (
                <>
                  {" "}
                  (변경사항 <b style={{ color: "var(--text-secondary)" }}>{dirtyInfo.dirtyCount}개</b>)
                </>
              ) : null}
              .
            </p>
          </div>

          {/* Regenerate ALL button (리셋용) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
            <button
              onClick={handleRegenerateAll}
              disabled={isRegenAllDisabled}
              title="3개 장면이 전부 마음에 없을 때: 수정사항을 무시하고 전체를 다시 생성합니다"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "var(--radius)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                cursor: isRegenAllDisabled ? "not-allowed" : isRegenerating ? "wait" : "pointer",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transition: "border-color 0.2s, color 0.2s",
                opacity: isRegenAllDisabled ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} style={{ animation: isRegenerating ? "spin 0.8s linear infinite" : "none" }} />
              {isRegenerating ? "REGENERATING" : "REGENERATE ALL"}
            </button>

            <div style={{ textAlign: "right", maxWidth: 380, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              3개 모두 마음에 안 들면 <b style={{ color: "var(--text-secondary)" }}>전체 재생성</b>을 사용하세요.
            </div>
          </div>
        </div>
      </div>

      {/* Scene Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
        {scenes.map((scene, index) => {
          const isDirty = dirtyInfo.dirtyIds.includes(scene.id);

          return (
            <div
              key={scene.id}
              className={`cinema-card hover-lift fade-up`}
              style={{ animationDelay: `${0.1 + index * 0.1}s`, opacity: 0 }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--glass-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="scene-badge">{scene.title || `SCENE ${scene.id}`}</span>

                  {isDirty && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        color: "rgba(124,58,237,0.95)",
                        border: "1px solid rgba(124,58,237,0.35)",
                        background: "rgba(124,58,237,0.08)",
                        padding: "2px 8px",
                        borderRadius: 999,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                      title="수정됨: 영상 생성 시 자동 반영됩니다"
                    >
                      EDITED
                    </span>
                  )}

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Clock size={11} />
                    {scene.duration + "초"}
                  </span>
                </div>

                {editingSceneId !== scene.id && (
                  <button
                    onClick={() => handleEditScene(scene.id, scene.description)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "calc(var(--radius) - 4px)",
                      background: "transparent",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-muted)",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      transition: "border-color 0.2s, color 0.2s",
                    }}
                  >
                    <Edit3 size={11} />
                    EDIT
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: "18px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                {/* Scene Image */}
                <div
                  style={{
                    aspectRatio: "16/9",
                    borderRadius: "calc(var(--radius) - 2px)",
                    overflow: "hidden",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--glass-border)",
                    position: "relative",
                  }}
                >
                  {scene.imageUrl ? (
                    <>
                      <img
                        src={scene.imageUrl}
                        alt={`Scene ${scene.id}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)",
                        }}
                      />
                      <div style={{ position: "absolute", bottom: "8px", right: "8px" }}>
                        <span className="status-badge status-badge-complete">READY</span>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.25s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.7)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Play size={18} style={{ color: "white", marginLeft: "2px" }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <Play size={20} style={{ color: "var(--text-muted)" }} />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Pending
                      </span>
                    </div>
                  )}
                </div>

                {/* Scene Description */}
                <div>
                  {editingSceneId === scene.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          resize: "none",
                          background: "var(--bg-surface)",
                          border: "1px solid rgba(124,58,237,0.4)",
                          borderRadius: "calc(var(--radius) - 2px)",
                          color: "var(--text-primary)",
                          padding: "10px 12px",
                          fontSize: "0.85rem",
                          fontFamily: "var(--font-body)",
                          outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 12px",
                            borderRadius: "calc(var(--radius) - 4px)",
                            background: "rgba(16,185,129,0.15)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            color: "#6ee7b7",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          <Check size={12} /> SAVE
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 12px",
                            borderRadius: "calc(var(--radius) - 4px)",
                            background: "transparent",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-secondary)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          <X size={12} /> CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: "2px",
                            height: "40px",
                            borderRadius: "2px",
                            background: "linear-gradient(to bottom, var(--accent-violet), var(--accent-blue))",
                            flexShrink: 0,
                            marginTop: "3px",
                          }}
                        />
                        <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                          {scene.description}
                        </p>
                      </div>
                      <div
                        style={{
                          marginTop: "12px",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        SCENE {scene.id} · {scene.duration + "초"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Strip */}
      <div
        className="fade-up fade-up-3"
        style={{
          padding: "14px 18px",
          marginBottom: "1.25rem",
          borderRadius: "var(--radius)",
          background: "rgba(124, 58, 237, 0.06)",
          border: "1px solid rgba(124, 58, 237, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {[
            { label: "SCENES", value: `${scenes.length}` },
            { label: "EST. LENGTH", value: scenes.reduce((sum, scene) => sum + scene.duration, 0) + "s" },
            { label: "RESOLUTION", value: "1080p" },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text-accent)",
                  marginTop: "1px",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div className="status-badge status-badge-active">
          {isRegenerating
            ? (dirtyInfo.dirtyCount > 0 ? "UPDATING PROMPTS..." : "WORKING...")
            : (dirtyInfo.dirtyCount > 0 ? `CHANGES: ${dirtyInfo.dirtyCount}` : "READY TO RENDER")}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fade-up fade-up-4" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={onEdit}
          disabled={isRegenerating}
          style={{
            flex: 1,
            minWidth: "120px",
            height: "48px",
            background: "transparent",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius)",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            cursor: isRegenerating ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "border-color 0.2s, color 0.2s",
            opacity: isRegenerating ? 0.6 : 1,
          }}
          title={isRegenerating ? "처리 중에는 이동할 수 없습니다" : undefined}
        >
          <Edit3 size={15} />
          처음으로
        </button>

        <button
          className="btn-cinema-primary"
          onClick={handleGenerateVideoClick}
          disabled={isRegenerating}
          style={{
            flex: 2,
            minWidth: "180px",
            height: "48px",
            fontSize: "0.9rem",
            cursor: isRegenerating ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            opacity: isRegenerating ? 0.85 : 1,
          }}
          title={
            dirtyInfo.dirtyCount > 0
              ? "변경사항이 있어 영상 생성 전 프롬프트를 업데이트합니다"
              : "바로 영상 생성 단계로 이동합니다"
          }
        >
          <Play size={16} />
          {isRegenerating
            ? (dirtyInfo.dirtyCount > 0 ? "프롬프트 업데이트 중..." : "처리 중...")
            : "영상 생성하기"}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}