import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type StepKey = "create" | "scenario" | "render" | "result";

const STEP_ORDER: StepKey[] = ["create", "scenario", "render", "result"];

const STEP_LABELS: Record<StepKey, string> = {
  create: "CHARACTER",
  scenario: "SCENARIO",
  render: "RENDER",
  result: "RESULT",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');`;

const GLOBAL_CSS = `
${FONTS}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: #000; color: #f0f0f8; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: #000; }
::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.5); border-radius: 2px; }

@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes floatY { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-18px); } }
@keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 40px rgba(124,58,237,0.7), 0 0 80px rgba(124,58,237,0.2); } }
@keyframes scrollBounce { 0%,100% { transform: translateY(0); opacity:1; } 50% { transform: translateY(6px); opacity:0.4; } }
@keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes lineGrow { from { width: 0; } to { width: 100%; } }
@keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(60px,-80px) scale(1.1);} 66%{transform:translate(-40px,40px) scale(0.9);} }
@keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-70px,50px) scale(1.08);} 66%{transform:translate(30px,-40px) scale(0.92);} }
@keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(40px,-50px) scale(1.1);} }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes ping { 0%{transform:scale(1);opacity:0.4;} 100%{transform:scale(2.2);opacity:0;} }

.font-display { font-family: 'Syne', sans-serif; }
.font-mono { font-family: 'Space Mono', monospace; }

.glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.07);
}
.glass-hover:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(124,58,237,0.3);
}
.cinema-card {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}
.cinema-card::before {
  content:'';
  position:absolute;
  top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(59,130,246,0.4), transparent);
  opacity:0;
  transition: opacity 0.3s;
}
.cinema-card:hover { border-color: rgba(124,58,237,0.25); }
.cinema-card:hover::before { opacity:1; }

.btn-primary {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #3b82f6 100%);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: 12px;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background-position 0.4s, box-shadow 0.3s, transform 0.2s;
  box-shadow: 0 4px 24px rgba(124,58,237,0.35);
}
.btn-primary:hover {
  background-position: right center;
  box-shadow: 0 8px 40px rgba(124,58,237,0.55);
  transform: translateY(-2px);
}
.btn-outline {
  background: transparent;
  color: rgba(196,181,253,0.9);
  border: 1px solid rgba(124,58,237,0.45);
  border-radius: 12px;
  font-family: 'Syne', sans-serif;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.25s, border-color 0.25s, transform 0.2s;
}
.btn-outline:hover {
  background: rgba(124,58,237,0.1);
  border-color: rgba(124,58,237,0.75);
  transform: translateY(-2px);
}

.gradient-text {
  background: linear-gradient(135deg, #c4b5fd 0%, #93c5fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eyebrow {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9d5cf6;
  display: flex;
  align-items: center;
  gap: 10px;
}
.eyebrow::before {
  content:'';
  display:inline-block;
  width:20px; height:1px;
  background: #7c3aed;
  box-shadow: 0 0 6px #7c3aed;
}
.noise-overlay {
  position:fixed; inset:0; pointer-events:none; z-index:1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size:200px 200px;
  opacity:0.3;
}
`;

function getCurrentStep(pathname: string): StepKey | null {
  if (pathname.startsWith("/create")) return "create";
  if (pathname.startsWith("/scenario")) return "scenario";
  if (pathname.startsWith("/render")) return "render";
  if (pathname.startsWith("/result")) return "result";
  return null;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentStep = getCurrentStep(location.pathname);

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh", position: "relative" }}>
      {/* Cinematic ambient orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 70%)",
            filter: "blur(40px)",
            animation: "blob 20s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "-10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(59,130,246,.08) 0%,transparent 70%)",
            filter: "blur(50px)",
            animation: "blob 25s ease-in-out infinite",
            animationDelay: "2s",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            left: "30%",
            width: 700,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse,rgba(124,58,237,.07) 0%,transparent 70%)",
            filter: "blur(60px)",
            animation: "blob 30s ease-in-out infinite",
            animationDelay: "4s",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(124,58,237,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.03) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 100% 100% at 50% 0%,black 0%,transparent 80%)",
          }}
        />
      </div>

      {/* Step indicator */}
      <button
        onClick={() => navigate("/")}
        style={{
          position: "fixed",
          top: "16px",
          left: "24px",
          zIndex: 60,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
        aria-label="홈으로 이동"
      >
        <div className="font-display" style={{ fontSize: "1rem", fontWeight: 800, background: "linear-gradient(135deg, #c4b5fd, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.01em" }}>
          GEN SCENE
        </div>
      </button>

      {currentStep && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "999px",
            background: "rgba(10,10,16,.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,.07)",
          }}
        >
          {STEP_ORDER.map((step, i) => {
            const currentIndex = STEP_ORDER.indexOf(currentStep);
            const isCurrent = currentStep === step;
            const isPast = currentIndex > i;

            return (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {i > 0 && (
                  <div
                    style={{
                      width: 16,
                      height: 1,
                      background: isPast
                        ? "rgba(124,58,237,.5)"
                        : "rgba(255,255,255,.07)",
                      transition: "background .4s",
                    }}
                  />
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isCurrent
                        ? "var(--accent-violet)"
                        : isPast
                        ? "rgba(124,58,237,.5)"
                        : "var(--text-muted)",
                      boxShadow: isCurrent ? "0 0 8px var(--accent-violet)" : "none",
                      transition: "background .4s,box-shadow .4s",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: ".55rem",
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      color: isCurrent
                        ? "var(--text-accent)"
                        : isPast
                        ? "rgba(196,181,253,.5)"
                        : "var(--text-muted)",
                      transition: "color .4s",
                    }}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative" style={{ zIndex: 10, paddingTop: "60px", paddingBottom: "40px" }}>
        {children}
      </div>

      <style>{`
        ${GLOBAL_CSS}
        @keyframes blob {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(40px,-60px) scale(1.05); }
          66% { transform:translate(-30px,30px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
