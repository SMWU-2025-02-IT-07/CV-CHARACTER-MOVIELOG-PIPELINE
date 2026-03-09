import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

type StepKey = "create" | "scenario" | "render" | "result";

const STEP_ORDER: StepKey[] = ["create", "scenario", "render", "result"];

const STEP_LABELS: Record<StepKey, string> = {
  create: "CHARACTER",
  scenario: "SCENARIO",
  render: "RENDER",
  result: "RESULT",
};

function getCurrentStep(pathname: string): StepKey | null {
  if (pathname.startsWith("/create")) return "create";
  if (pathname.startsWith("/scenario")) return "scenario";
  if (pathname.startsWith("/render")) return "render";
  if (pathname.startsWith("/result")) return "result";
  return null;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
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
        @keyframes blob {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(40px,-60px) scale(1.05); }
          66% { transform:translate(-30px,30px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}