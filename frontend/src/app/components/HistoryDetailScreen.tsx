import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, Film, Clock3, Download } from "lucide-react";
import { AIService } from "@/services/ai.service";
import { DownloadService } from "@/services/download.service";
import type { LibraryScenarioDetail } from "@/services/ai.service";
import { useAppContext } from "@/context/AppContext";

export function HistoryDetailScreen() {
  const navigate = useNavigate();
  const { scenarioId } = useParams();
  const { characterData, setCharacterData, setScenarioId, setScenes, setFinalVideoUrl } = useAppContext();
  const [data, setData] = useState<LibraryScenarioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!scenarioId) {
        setError("scenarioId가 없습니다.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await AIService.getScenarioDetail(scenarioId);
        setData(res);
      } catch (e) {
        console.error(e);
        setError("상세 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [scenarioId]);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("ko-KR");
  };

  const sceneCount = data?.scenes.length ?? 0;
  const imageReadyCount = data?.scenes.filter((scene) => !!scene.image_url).length ?? 0;
  const videoReadyCount = data?.scenes.filter((scene) => !!scene.video_url).length ?? 0;
  const nextStep = !data
    ? null
    : imageReadyCount < sceneCount
      ? "scenario"
      : videoReadyCount < sceneCount
        ? "render"
        : "result";
  const progressLabel = !data
    ? ""
    : nextStep === "scenario"
      ? `시나리오 단계 · 이미지 ${imageReadyCount}/${sceneCount}`
      : nextStep === "render"
        ? `영상 단계 · 영상 ${videoReadyCount}/${sceneCount}`
        : "완료";

  const canContinueWork = !!data && !data.final_video_url;

  const handleContinueWork = () => {
    if (!data) return;

    setScenarioId(data.scenario_id);
    setScenes(
      data.scenes.map((scene) => ({
        id: scene.id,
        title: scene.title,
        description: scene.description,
        duration: scene.duration,
        imageUrl: scene.image_url,
        videoUrl: scene.video_url,
      }))
    );
    setFinalVideoUrl("");
    setCharacterData({
      ...characterData,
      imageUrl: characterData.imageUrl || data.thumbnail_url || "",
    });
    navigate(nextStep === "scenario" ? "/scenario" : "/render");
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 relative z-10">
        <div className="cinema-card" style={{ padding: "2rem", textAlign: "center" }}>
          목록을 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 relative z-10">
        <div
          className="cinema-card"
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#fca5a5",
          }}
        >
          {error || "데이터가 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 relative z-10">
      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/history")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "var(--radius)",
            background: "var(--bg-surface)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} />
          목록으로
        </button>

        {canContinueWork && (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: "var(--radius)",
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.18)",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
              }}
            >
              {progressLabel}
            </div>
            <button
              className="btn-cinema-primary"
              onClick={handleContinueWork}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                height: "auto",
              }}
            >
              <Play size={14} />
              작업 이어하기
            </button>
          </>
        )}
      </div>

      <div className="fade-up fade-up-1" style={{ marginBottom: "1.5rem" }}>
        <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>
          Scenario Detail
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.7rem, 3vw, 2.4rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--text-primary)",
            marginBottom: "0.4rem",
          }}
        >
          {data.title}
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.92rem",
            marginBottom: "0.5rem",
          }}
        >
          {data.brief}
        </p>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.78rem",
          }}
        >
          마지막 업데이트: {formatDate(data.updated_at || data.created_at)}
        </div>
      </div>

      {data.final_video_url && (
        <div
          className="cinema-card fade-up fade-up-2"
          style={{ marginBottom: "1.25rem", overflow: "hidden" }}
        >
          <div
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, var(--accent-violet), var(--accent-blue))",
            }}
          />
          <div style={{ padding: "1.1rem" }}>
            <div
              style={{
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                최종 영상
              </div>
              <button
                onClick={() => {
                  const filename = DownloadService.generateFilename('final_video');
                  DownloadService.downloadVideo(data.final_video_url, filename);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius)",
                  background: "transparent",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                title="최종 영상 다운로드"
              >
                <Download size={13} />
                다운로드
              </button>
            </div>

            <div
              style={{
                position: "relative",
                aspectRatio: "16/9",
                overflow: "hidden",
                borderRadius: "var(--radius)",
                background: "#05060a",
              }}
            >
              <video
                ref={videoRef}
                src={data.final_video_url}
                controls
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="cinema-card fade-up fade-up-3" style={{ overflow: "hidden" }}>
        <div
          style={{
            height: "2px",
            background:
              "linear-gradient(90deg, rgba(124,58,237,0.65), rgba(59,130,246,0.5))",
          }}
        />

        <div style={{ padding: "1.1rem" }}>
          <div
            style={{
              marginBottom: 12,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            장면 목록
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {data.scenes.map((scene) => (
              <div
                key={scene.id}
                className="cinema-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr",
                  gap: "14px",
                  overflow: "hidden",
                  background: "var(--bg-surface-elevated)",
                }}
              >
                <div
                  style={{
                    minHeight: 140,
                    background: scene.image_url
                      ? `url(${scene.image_url}) center / cover no-repeat`
                      : "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(59,130,246,0.12))",
                  }}
                />

                <div style={{ padding: "14px 14px 14px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {scene.title || `Scene ${scene.id}`}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Clock3 size={12} />
                        {scene.duration}초
                      </span>

                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Film size={12} />
                        {scene.video_url ? "영상 있음" : "영상 없음"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      marginBottom: "10px",
                    }}
                  >
                    {scene.description}
                  </div>

                  {scene.video_url && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <a
                        href={scene.video_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 12px",
                          borderRadius: "var(--radius)",
                          background: "rgba(124,58,237,0.1)",
                          border: "1px solid rgba(124,58,237,0.24)",
                          color: "#c4b5fd",
                          textDecoration: "none",
                          fontSize: "0.82rem",
                        }}
                      >
                        <Play size={13} />
                        장면 영상 보기
                      </a>
                      <button
                        onClick={() => {
                          const filename = DownloadService.generateFilename(`scene_${scene.id}`);
                          DownloadService.downloadVideo(scene.video_url, filename);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 12px",
                          borderRadius: "var(--radius)",
                          background: "transparent",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-secondary)",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "border-color 0.2s, color 0.2s",
                        }}
                        title="장면 영상 다운로드"
                      >
                        <Download size={13} />
                        다운로드
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
