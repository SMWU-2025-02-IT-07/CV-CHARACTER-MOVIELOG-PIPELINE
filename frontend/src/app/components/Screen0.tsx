import { useState, useEffect, useRef, RefObject } from "react";

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

/* ─── DATA ───────────────────────────────────────── */
const STEPS = [
  { num: "01", title: "캐릭터 업로드", desc: "이미지 업로드 후 이름·상황을 입력하면 AI가 캐릭터를 분석합니다." },
  { num: "02", title: "시나리오 생성", desc: "AI가 3개의 장면을 자동 구성. 원하는 대로 수정도 가능합니다." },
  { num: "03", title: "영상 렌더링", desc: "장면별 영상을 생성하고 최종 병합까지 실시간으로 진행됩니다." },
  { num: "04", title: "결과 다운로드", desc: "완성된 1080p 영상을 즉시 확인·다운로드·공유하세요." },
];

const MARQUEE_ITEMS = [
  "GENERATIVE AI", "TEXT-TO-VIDEO", "CHARACTER DRIVEN", "3-SCENE PIPELINE",
  "1080P OUTPUT", "REAL-TIME RENDER", "INSTANT DOWNLOAD", "SCENARIO ENGINE",
  "GENERATIVE AI", "TEXT-TO-VIDEO", "CHARACTER DRIVEN", "3-SCENE PIPELINE",
  "1080P OUTPUT", "REAL-TIME RENDER", "INSTANT DOWNLOAD", "SCENARIO ENGINE",
];

const SPEC_ROWS = [
  { component: "이미지 분석", material: "Vision AI", detail: "캐릭터 특징 자동 추출" },
  { component: "시나리오 생성", material: "LLM Engine", detail: "맥락 기반 3-씬 구성" },
  { component: "영상 합성", material: "Video Diffusion", detail: "장면당 4초 · 고해상도" },
  { component: "최종 병합", material: "Render Pipeline", detail: "멀티-씬 시퀀스 병합" },
  { component: "출력 포맷", material: "H.264 / MP4", detail: "1920×1080 · 30fps" },
];

const FAQS = [
  { q: "어떤 이미지를 업로드해야 하나요?", a: "PNG·JPG 파일 최대 10MB. 정면이 잘 보이는 캐릭터 이미지를 권장합니다." },
  { q: "영상 생성까지 얼마나 걸리나요?", a: "시나리오 생성 약 2초, 장면당 영상 렌더링 약 2초로 총 10초 내외입니다." },
  { q: "생성된 영상을 수정할 수 있나요?", a: "각 장면의 설명 텍스트를 수정하거나 마음에 들지 않는 장면을 개별 재생성할 수 있습니다." },
  { q: "상업적으로 사용해도 되나요?", a: "생성된 영상의 저작권은 사용자에게 있으며 상업적 사용이 가능합니다." },
];

/* ─── HOOK: scroll-aware ─────────────────────────── */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return y;
}

function useInView(ref: RefObject<Element | null>, threshold = 0.15): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref || !ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

/* ─── SUB-COMPONENTS ─────────────────────────────── */

function HeroSection({ onStart }: { onStart: () => void }) {
  const scrollY = useScrollY();
  const heroOpacity = Math.max(0, 1 - scrollY / 400);
  const heroY = scrollY * 0.35;

  return (
    <section style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden", display: "flex", alignItems: "center" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)", filter: "blur(50px)", animation: "orbFloat1 22s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "20%", right: "-15%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)", filter: "blur(60px)", animation: "orbFloat2 28s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "35%", width: 500, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 65%)", filter: "blur(70px)", animation: "orbFloat3 35s ease-in-out infinite" }} />
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "radial-gradient(ellipse 90% 80% at 50% 10%, black 0%, transparent 75%)" }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "0 2rem", transform: `translateY(${heroY}px)`, opacity: heroOpacity, transition: "opacity 0.1s" }}>
        <div style={{ maxWidth: 680 }}>
          <div className="eyebrow" style={{ marginBottom: "1.5rem", animation: "fadeUp 0.7s 0.1s both" }}>AI Video Generation Platform</div>

          <h1 className="font-display" style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "1.5rem", animation: "fadeUp 0.7s 0.2s both" }}>
            캐릭터를 입력하면<br />
            <span className="gradient-text">AI가 영상을</span><br />
            만들어드립니다
          </h1>

          <p style={{ fontSize: "1rem", color: "rgba(136,136,168,0.9)", lineHeight: 1.75, maxWidth: 480, marginBottom: "2.25rem", fontWeight: 300, animation: "fadeUp 0.7s 0.3s both" }}>
            이미지 한 장으로 시작하세요. AI가 시나리오를 구성하고 장면별 영상을 생성·병합해 완성된 단편을 바로 건네드립니다.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", animation: "fadeUp 0.7s 0.4s both" }}>
            <button className="btn-primary" onClick={onStart} style={{ padding: "0 2rem", height: 52, fontSize: "0.95rem" }}>
              지금 시작하기  →
            </button>
            <button className="btn-outline" style={{ padding: "0 1.75rem", height: 52, fontSize: "0.9rem" }}>
              데모 영상 보기
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: "2rem", marginTop: "3rem", animation: "fadeUp 0.7s 0.5s both" }}>
            {[["10s", "생성 소요시간"], ["1080p", "출력 해상도"], ["3-Scene", "자동 구성"]].map(([val, label]) => (
              <div key={label}>
                <div className="font-display" style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c4b5fd" }}>{val}</div>
                <div className="font-mono" style={{ fontSize: "0.62rem", color: "#44445a", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: floating visual */}
      <div style={{ position: "absolute", right: "5%", top: "50%", transform: "translateY(-50%)", zIndex: 5, animation: "floatY 5s ease-in-out infinite", opacity: 0.85 }}>
        <div style={{ width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(124,58,237,0.25), rgba(59,130,246,0.1) 60%, transparent 80%)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulseGlow 4s ease-in-out infinite", position: "relative" }}>
          {/* inner ring */}
          <div style={{ position: "absolute", inset: 20, borderRadius: "50%", border: "1px solid rgba(124,58,237,0.15)" }} />
          <div style={{ position: "absolute", inset: 50, borderRadius: "50%", border: "1px solid rgba(59,130,246,0.12)" }} />
          <span className="font-display" style={{ fontSize: "3.5rem", fontWeight: 800, background: "linear-gradient(135deg, #c4b5fd, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
        </div>
      </div>

      {/* Scroll cue */}
      <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", opacity: Math.max(0, 1 - scrollY / 120), transition: "opacity 0.3s", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 20 }}>
        <div style={{ width: 22, height: 34, borderRadius: 12, border: "1.5px solid rgba(124,58,237,0.5)", display: "flex", justifyContent: "center", paddingTop: 6 }}>
          <div style={{ width: 3, height: 7, borderRadius: 2, background: "#9d5cf6", animation: "scrollBounce 1.8s ease-in-out infinite" }} />
        </div>
        <span className="font-mono" style={{ fontSize: "0.55rem", color: "#44445a", letterSpacing: "0.15em", textTransform: "uppercase" }}>SCROLL</span>
      </div>
    </section>
  );
}

function MarqueeSection() {
  return (
    <section style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
      <p className="font-mono" style={{ textAlign: "center", fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#44445a", marginBottom: "3rem" }}>
        POWERED BY CUTTING-EDGE AI TECHNOLOGY
      </p>
      <div style={{ display: "flex", overflow: "hidden", maskImage: "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)" }}>
        <div style={{ display: "flex", gap: "4rem", animation: "marquee 50s linear infinite", whiteSpace: "nowrap", flexShrink: 0 }}>
          {MARQUEE_ITEMS.map((item, i) => (
            <span key={i} className="font-display" style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(136,136,168,0.45)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4rem" }}>
              {item}
              <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "rgba(124,58,237,0.5)" }} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <section ref={ref} style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem" }}>
      <div style={{ marginBottom: "4rem", animation: visible ? "fadeUp 0.7s both" : "none", opacity: visible ? undefined : 0 }}>
        <div className="eyebrow" style={{ marginBottom: "1rem" }}>How It Works</div>
        <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em" }}>
          4단계로 완성되는<br /><span className="gradient-text">AI 영상 제작</span>
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem" }}>
        {STEPS.map((step, i) => (
          <div key={step.num} className="cinema-card glass-hover" style={{ padding: "1.75rem", animation: visible ? `fadeUp 0.7s ${0.1 + i * 0.1}s both` : "none", opacity: visible ? undefined : 0, cursor: "default" }}>
            <div className="font-mono" style={{ fontSize: "2.2rem", fontWeight: 700, color: "rgba(124,58,237,0.25)", marginBottom: "1.25rem", lineHeight: 1 }}>{step.num}</div>
            <h3 className="font-display" style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f8", marginBottom: "0.6rem", letterSpacing: "-0.01em" }}>{step.title}</h3>
            <p style={{ fontSize: "0.83rem", color: "#8888a8", lineHeight: 1.65, fontWeight: 300 }}>{step.desc}</p>
            {/* bottom accent */}
            <div style={{ marginTop: "1.5rem", height: 2, borderRadius: 2, background: `linear-gradient(90deg, rgba(124,58,237,${0.4 + i * 0.15}), rgba(59,130,246,0.3))`, width: `${50 + i * 12}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SpecTable() {
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <section ref={ref} style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: "3rem", animation: visible ? "fadeUp 0.7s both" : "none", opacity: visible ? undefined : 0 }}>
          <div className="eyebrow" style={{ marginBottom: "1rem" }}>Technical Specification</div>
          <h2 className="font-display" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, letterSpacing: "-0.025em" }}>
            AI PIPELINE <span className="gradient-text">ARCHITECTURE</span>
          </h2>
        </div>

        {/* Table */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", animation: visible ? "fadeUp 0.7s 0.15s both" : "none", opacity: visible ? undefined : 0 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 2fr", padding: "0.9rem 1.5rem", background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {["COMPONENT", "ENGINE", "DETAIL"].map(col => (
              <span key={col} className="font-mono" style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", color: "#9d5cf6", textTransform: "uppercase" }}>{col}</span>
            ))}
          </div>
          {/* Rows */}
          {SPEC_ROWS.map((row, i) => (
            <div key={row.component} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 2fr", padding: "1.1rem 1.5rem", borderBottom: i < SPEC_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span className="font-display" style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f0f0f8" }}>{row.component}</span>
              <span className="font-mono" style={{ fontSize: "0.78rem", color: "#c4b5fd", letterSpacing: "0.03em" }}>{row.material}</span>
              <span style={{ fontSize: "0.82rem", color: "#8888a8", fontWeight: 300 }}>{row.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onStart }: { onStart: () => void }) {
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <section ref={ref} style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>

        {/* Left text */}
        <div style={{ animation: visible ? "fadeUp 0.8s both" : "none", opacity: visible ? undefined : 0 }}>
          <div className="eyebrow" style={{ marginBottom: "1.5rem" }}>Start Creating</div>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
            지금 바로<br /><span className="gradient-text">첫 영상을</span><br />만들어보세요
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#8888a8", lineHeight: 1.75, marginBottom: "2rem", fontWeight: 300, maxWidth: 380 }}>
            이미지 한 장, 한 줄 설명이면 충분합니다. AI가 나머지를 모두 처리합니다.
          </p>
          <button className="btn-primary" onClick={onStart} style={{ padding: "0 2.25rem", height: 52, fontSize: "0.95rem" }}>
            무료로 시작하기  →
          </button>
        </div>

        {/* Right visual */}
        <div style={{ animation: visible ? "fadeUp 0.8s 0.15s both" : "none", opacity: visible ? undefined : 0 }}>
          <div className="cinema-card" style={{ padding: "2rem", position: "relative", overflow: "hidden" }}>
            {/* Mock terminal-style UI preview */}
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
            </div>
            <div className="font-mono" style={{ fontSize: "0.72rem", color: "#9d5cf6", marginBottom: "0.5rem", letterSpacing: "0.05em" }}>// AI PIPELINE STATUS</div>
            {[
              { label: "CHARACTER LOAD", done: true },
              { label: "SCENARIO GEN", done: true },
              { label: "SCENE 1 RENDER", done: true },
              { label: "SCENE 2 RENDER", done: true },
              { label: "SCENE 3 RENDER", progress: 0.72 },
              { label: "FINAL MERGE", waiting: true },
            ].map((item, i) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: item.done ? "rgba(16,185,129,0.15)" : item.progress ? "rgba(124,58,237,0.15)" : "rgba(100,100,120,0.1)", border: `1px solid ${item.done ? "rgba(16,185,129,0.4)" : item.progress ? "rgba(124,58,237,0.4)" : "rgba(100,100,120,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.done && <span style={{ fontSize: 9, color: "#10b981" }}>✓</span>}
                  {item.progress && <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1px solid transparent", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-mono" style={{ fontSize: "0.65rem", color: item.done ? "#6ee7b7" : item.progress ? "#c4b5fd" : "#44445a", letterSpacing: "0.06em" }}>{item.label}</div>
                  {item.progress && (
                    <div style={{ marginTop: 4, height: 2, background: "rgba(100,100,120,0.2)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${item.progress * 100}%`, background: "linear-gradient(90deg, #7c3aed, #3b82f6)", borderRadius: 2, boxShadow: "0 0 6px rgba(124,58,237,0.7)" }} />
                    </div>
                  )}
                </div>
                {item.done && <span className="font-mono" style={{ fontSize: "0.6rem", color: "#44445a" }}>2.1s</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <section ref={ref} style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: "3rem", animation: visible ? "fadeUp 0.7s both" : "none", opacity: visible ? undefined : 0 }}>
          <div className="eyebrow" style={{ marginBottom: "1rem" }}>FAQ</div>
          <h2 className="font-display" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            자주 묻는 질문
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", animation: visible ? "fadeUp 0.7s 0.1s both" : "none", opacity: visible ? undefined : 0 }}>
          {FAQS.map((item, i) => (
            <div key={i} className="cinema-card" style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ padding: "1.1rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span className="font-display" style={{ fontSize: "0.92rem", fontWeight: 600, color: open === i ? "#c4b5fd" : "#d0d0e8", letterSpacing: "-0.01em" }}>{item.q}</span>
                <span style={{ fontSize: "1.1rem", color: open === i ? "#9d5cf6" : "#44445a", transition: "transform 0.3s, color 0.2s", transform: open === i ? "rotate(45deg)" : "rotate(0deg)", flexShrink: 0 }}>+</span>
              </div>
              {open === i && (
                <div style={{ padding: "0 1.4rem 1.1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ fontSize: "0.85rem", color: "#8888a8", lineHeight: 1.7, paddingTop: "0.8rem", fontWeight: 300 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onStart }: { onStart: () => void }) {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "3rem 2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <div className="font-display" style={{ fontSize: "1.1rem", fontWeight: 800, background: "linear-gradient(135deg, #c4b5fd, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI VIDEO</div>
          <div className="font-mono" style={{ fontSize: "0.6rem", color: "#44445a", letterSpacing: "0.12em", marginTop: 4, textTransform: "uppercase" }}>Generation Platform</div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["서비스 소개", "문의하기", "개인정보처리방침"].map(link => (
            <span key={link} style={{ fontSize: "0.78rem", color: "#44445a", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "color 0.2s" }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = "#c4b5fd"}
              onMouseLeave={e => (e.target as HTMLElement).style.color = "#44445a"}
            >{link}</span>
          ))}
        </div>
        <button className="btn-outline" onClick={onStart} style={{ padding: "0 1.25rem", height: 38, fontSize: "0.8rem" }}>
          시작하기  →
        </button>
      </div>
      <div style={{ maxWidth: 1100, margin: "1.5rem auto 0", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1.5rem" }}>
        <p className="font-mono" style={{ fontSize: "0.58rem", color: "#2a2a3a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          © 2025 AI Video Generation Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ─── MAIN EXPORT ────────────────────────────────── */
export default function Screen0({ onStart }: { onStart: () => void }) {
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="noise-overlay" />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", background: "rgba(0,0,0,0.7)" }}>
        <div className="font-display" style={{ fontSize: "1rem", fontWeight: 800, background: "linear-gradient(135deg, #c4b5fd, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.01em" }}>
          AI VIDEO GEN
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-outline" onClick={onStart} style={{ padding: "0 1.1rem", height: 36, fontSize: "0.8rem" }}>
            시작하기  →
          </button>
        </div>
      </nav>

      <main>
        <HeroSection onStart={onStart} />
        <MarqueeSection />
        <StepsSection />
        <SpecTable />
        <CTASection onStart={onStart} />
        <FAQSection />
        <Footer onStart={onStart} />
      </main>
    </>
  );
}