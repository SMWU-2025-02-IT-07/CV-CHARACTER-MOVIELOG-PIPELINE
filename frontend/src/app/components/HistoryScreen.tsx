import { useEffect, useState } from "react";
import { Film, Clock3, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIService } from "@/services/ai.service";
import type { LibraryScenarioSummary } from "@/services/ai.service";

export function HistoryScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LibraryScenarioSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await AIService.getScenarioList();
        setItems(res);
      } catch (e) {
        console.error(e);
        setError("저장된 영상 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("ko-KR");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return {
          label: "COMPLETE",
          color: "#6ee7b7",
          bg: "rgba(16,185,129,0.12)",
          border: "rgba(16,185,129,0.25)",
        };
      case "processing":
      case "rendering":
        return {
          label: "RENDERING",
          color: "#c4b5fd",
          bg: "rgba(124,58,237,0.12)",
          border: "rgba(124,58,237,0.25)",
        };
      default:
        return {
          label: "DRAFT",
          color: "var(--text-muted)",
          bg: "rgba(120,120,140,0.08)",
          border: "rgba(120,120,140,0.18)",
        };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 relative z-10">
      <div className="fade-up fade-up-1" style={{ marginBottom: "1.5rem" }}>
        <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>
          My Library
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.7rem, 3vw, 2.4rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          저장된 <span className="gradient-brand-text">시나리오 · 영상</span>
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.92rem",
          }}
        >
          이전에 생성한 작업을 다시 확인하고 이어서 볼 수 있습니다.
        </p>
      </div>

      <div className="cinema-card fade-up fade-up-2" style={{ overflow: "hidden" }}>
        <div
          style={{
            height: "2px",
            background:
              "linear-gradient(90deg, var(--accent-violet), var(--accent-blue))",
          }}
        />

        <div style={{ padding: "1.25rem" }}>
          {isLoading ? (
            <div
              style={{
                padding: "2.5rem 1rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              목록을 불러오는 중입니다...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "2rem 1rem",
                textAlign: "center",
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.22)",
                }}
              >
                <Sparkles size={20} style={{ color: "#c4b5fd" }} />
              </div>

              <div
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                아직 저장된 시나리오가 없습니다
              </div>

              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.88rem",
                  marginBottom: 16,
                }}
              >
                첫 영상을 만들어보면 이곳에서 다시 볼 수 있습니다.
              </div>

              <button
                className="btn-cinema-primary"
                onClick={() => navigate("/create")}
                style={{ height: 44, padding: "0 18px" }}
              >
                새로 만들기
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "14px",
              }}
            >
              {items.map((item) => {
                const status = getStatusLabel(item.status);

                return (
                  <button
                    key={item.scenario_id}
                    onClick={() => navigate(`/history/${item.scenario_id}`)}
                    className="cinema-card"
                    style={{
                      textAlign: "left",
                      padding: 0,
                      background: "var(--bg-surface-elevated)",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "16 / 9",
                        background: item.thumbnail_url
                          ? `url(${item.thumbnail_url}) center / cover no-repeat`
                          : "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(59,130,246,0.12))",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: status.bg,
                          border: `1px solid ${status.border}`,
                          color: status.color,
                          fontSize: "0.66rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: status.color,
                          }}
                        />
                        {status.label}
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          bottom: 12,
                          left: 12,
                          right: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "rgba(0,0,0,0.55)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "white",
                            fontSize: "0.72rem",
                          }}
                        >
                          <Film size={13} />
                          {item.final_video_url ? "영상 있음" : "시나리오만"}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "14px 14px 16px" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "var(--text-primary)",
                          marginBottom: 8,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--text-muted)",
                          fontSize: "0.78rem",
                          marginBottom: 12,
                        }}
                      >
                        <Clock3 size={13} />
                        {formatDate(item.updated_at || item.created_at)}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          color: "var(--text-secondary)",
                          fontSize: "0.82rem",
                        }}
                      >
                        <span>상세 보기</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}