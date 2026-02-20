// src/app/App.tsx

import { useState, useEffect, useRef } from "react";
import { AppProvider } from "@/context/AppContext";
import { Screen1 } from "@/app/components/Screen1";
import { Screen2 } from "@/app/components/Screen2";
import { Screen3 } from "@/app/components/Screen3";
import { Screen4 } from "@/app/components/Screen4";

/* ════════════════════════════════════════════════════
   LANDING PAGE STYLES
════════════════════════════════════════════════════ */
const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

@keyframes marquee  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes floatY   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
@keyframes pulseRing{ 0%,100%{box-shadow:0 0 20px rgba(124,58,237,.3)} 50%{box-shadow:0 0 50px rgba(124,58,237,.65),0 0 90px rgba(124,58,237,.18)} }
@keyframes scrollB  { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(7px);opacity:.35} }
@keyframes fadeUpL  { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes orbF1    { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(55px,-70px) scale(1.08)} 66%{transform:translate(-35px,35px) scale(.93)} }
@keyframes orbF2    { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-65px,45px) scale(1.07)} 66%{transform:translate(25px,-35px) scale(.93)} }
@keyframes orbF3    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(35px,-45px) scale(1.08)} }
@keyframes spinL    { to{transform:rotate(360deg)} }

.l-font-display { font-family:'Syne',sans-serif !important; }
.l-font-mono    { font-family:'Space Mono',monospace !important; }
.l-grad-text    { background:linear-gradient(135deg,#c4b5fd 0%,#93c5fd 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.l-eyebrow      { font-family:'Space Mono',monospace; font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#9d5cf6; display:flex; align-items:center; gap:10px; }
.l-eyebrow::before { content:''; display:inline-block; width:20px; height:1px; background:#7c3aed; box-shadow:0 0 6px #7c3aed; }

.l-cinema-card  { background:#111118; border:1px solid rgba(255,255,255,.07); border-radius:16px; transition:border-color .3s,box-shadow .3s; position:relative; overflow:hidden; }
.l-cinema-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,237,.5),rgba(59,130,246,.4),transparent); opacity:0; transition:opacity .3s; }
.l-cinema-card:hover   { border-color:rgba(124,58,237,.22); }
.l-cinema-card:hover::before { opacity:1; }

.l-btn-cta   { background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 50%,#3b82f6 100%); background-size:200% 200%; color:#fff; border:none; border-radius:12px; font-family:'Syne',sans-serif; font-weight:700; letter-spacing:.05em; cursor:pointer; position:relative; overflow:hidden; transition:background-position .4s,box-shadow .3s,transform .2s; box-shadow:0 4px 24px rgba(124,58,237,.35); }
.l-btn-cta:hover { background-position:right center; box-shadow:0 8px 40px rgba(124,58,237,.55); transform:translateY(-2px); }
.l-btn-ghost { background:transparent; color:rgba(196,181,253,.85); border:1px solid rgba(124,58,237,.4); border-radius:12px; font-family:'Syne',sans-serif; font-weight:600; letter-spacing:.04em; cursor:pointer; transition:background .25s,border-color .25s,transform .2s; }
.l-btn-ghost:hover { background:rgba(124,58,237,.1); border-color:rgba(124,58,237,.7); transform:translateY(-2px); }

.l-noise { position:fixed; inset:0; pointer-events:none; z-index:1; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size:200px 200px; opacity:.28; }
`;

/* ════════════════════════════════════════════════════
   DATA
════════════════════════════════════════════════════ */
const STEPS = [
  { num: "01", title: "캐릭터 업로드",  desc: "이미지 업로드 후 이름·상황을 입력하면 AI가 캐릭터를 분석합니다." },
  { num: "02", title: "시나리오 생성",  desc: "AI가 3개의 장면을 자동 구성. 원하는 대로 수정도 가능합니다." },
  { num: "03", title: "영상 렌더링",    desc: "장면별 영상을 생성하고 최종 병합까지 실시간으로 진행됩니다." },
  { num: "04", title: "결과 다운로드",  desc: "완성된 1080p 영상을 즉시 확인·다운로드·공유하세요." },
];

const MARQUEE_ITEMS = [
  "GENERATIVE AI","TEXT-TO-VIDEO","CHARACTER DRIVEN","3-SCENE PIPELINE",
  "1080P OUTPUT","REAL-TIME RENDER","INSTANT DOWNLOAD","SCENARIO ENGINE",
  "GENERATIVE AI","TEXT-TO-VIDEO","CHARACTER DRIVEN","3-SCENE PIPELINE",
  "1080P OUTPUT","REAL-TIME RENDER","INSTANT DOWNLOAD","SCENARIO ENGINE",
];

const SPECS = [
  { component: "이미지 분석",   engine: "Vision AI",       detail: "캐릭터 특징 자동 추출" },
  { component: "시나리오 생성", engine: "LLM Engine",       detail: "맥락 기반 3-씬 구성" },
  { component: "영상 합성",     engine: "Video Diffusion",  detail: "장면당 4초 · 고해상도" },
  { component: "최종 병합",     engine: "Render Pipeline",  detail: "멀티-씬 시퀀스 병합" },
  { component: "출력 포맷",     engine: "H.264 / MP4",      detail: "1920×1080 · 30fps" },
];

const FAQS = [
  { q: "어떤 이미지를 업로드해야 하나요?",   a: "PNG·JPG 파일 최대 10MB. 정면이 잘 보이는 캐릭터 이미지를 권장합니다." },
  { q: "영상 생성까지 얼마나 걸리나요?",      a: "시나리오 생성 약 2초, 장면당 렌더링 약 2초로 총 10초 내외입니다." },
  { q: "생성된 영상을 수정할 수 있나요?",     a: "각 장면 설명을 수정하거나 마음에 들지 않는 장면을 개별 재생성할 수 있습니다." },
  { q: "상업적으로 사용해도 되나요?",         a: "생성된 영상의 저작권은 사용자에게 있으며 상업적 사용이 가능합니다." },
];

const PIPELINE_ITEMS = [
  { label: "CHARACTER LOAD",  done: true },
  { label: "SCENARIO GEN",    done: true },
  { label: "SCENE 1 RENDER",  done: true },
  { label: "SCENE 2 RENDER",  done: true },
  { label: "SCENE 3 RENDER",  prog: 0.74 },
  { label: "FINAL MERGE",     wait: true },
];

/* ════════════════════════════════════════════════════
   HOOKS
════════════════════════════════════════════════════ */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return y;
}

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return vis;
}

/* ════════════════════════════════════════════════════
   LANDING SUB-COMPONENTS
════════════════════════════════════════════════════ */

function LandingNav({ onStart }: { onStart: () => void }) {
  const sy = useScrollY();
  const scrolled = sy > 40;
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,.06)" : "transparent"}`,
      backdropFilter: scrolled ? "blur(20px)" : "none",
      background: scrolled ? "rgba(0,0,0,.78)" : "transparent",
      transition: "all .35s",
    }}>
      <div className="l-font-display" style={{ fontSize: "1rem", fontWeight: 800, background: "linear-gradient(135deg,#c4b5fd,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        AI VIDEO GEN
      </div>
      <button className="l-btn-ghost" onClick={onStart} style={{ padding: "0 1.2rem", height: 38, fontSize: ".82rem" }}>
        시작하기  →
      </button>
    </nav>
  );
}

function LandingHero({ onStart }: { onStart: () => void }) {
  const sy = useScrollY();
  const fade = Math.max(0, 1 - sy / 350);
  const ty   = sy * 0.3;

  return (
    <section style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden", display: "flex", alignItems: "center" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-12%", left: "-8%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.13) 0%,transparent 65%)", filter: "blur(55px)", animation: "orbF1 22s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "25%", right: "-12%", width: 580, height: 580, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.09) 0%,transparent 65%)", filter: "blur(65px)", animation: "orbF2 28s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-8%", left: "38%", width: 500, height: 380, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(124,58,237,.06) 0%,transparent 65%)", filter: "blur(75px)", animation: "orbF3 34s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.04) 1px,transparent 1px)", backgroundSize: "70px 70px", maskImage: "radial-gradient(ellipse 90% 75% at 50% 5%,black 0%,transparent 80%)" }} />
      </div>

      {/* Text block */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "0 2rem", transform: `translateY(${ty}px)`, opacity: fade }}>
        <div style={{ maxWidth: 660 }}>
          <div className="l-eyebrow" style={{ marginBottom: "1.5rem", animation: "fadeUpL .7s .1s both" }}>
            AI Video Generation Platform
          </div>
          <h1 className="l-font-display" style={{ fontSize: "clamp(2.8rem,6.5vw,5.2rem)", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-.035em", marginBottom: "1.5rem", animation: "fadeUpL .7s .2s both" }}>
            캐릭터를 입력하면<br />
            <span className="l-grad-text">AI가 영상을</span><br />
            만들어드립니다
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(136,136,168,.9)", lineHeight: 1.78, maxWidth: 460, marginBottom: "2.25rem", fontWeight: 300, animation: "fadeUpL .7s .3s both" }}>
            이미지 한 장으로 시작하세요. AI가 시나리오를 구성하고 장면별 영상을 생성·병합해 완성된 단편을 바로 건네드립니다.
          </p>
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", animation: "fadeUpL .7s .4s both" }}>
            <button className="l-btn-cta" onClick={onStart} style={{ padding: "0 2.25rem", height: 52, fontSize: ".95rem" }}>
              지금 시작하기  →
            </button>
            <button className="l-btn-ghost" style={{ padding: "0 1.75rem", height: 52, fontSize: ".88rem" }}>
              데모 영상 보기
            </button>
          </div>
          <div style={{ display: "flex", gap: "2.5rem", marginTop: "3.25rem", animation: "fadeUpL .7s .5s both" }}>
            {[["10s","생성 소요시간"], ["1080p","출력 해상도"], ["3-Scene","자동 구성"]].map(([v, l]) => (
              <div key={l}>
                <div className="l-font-display" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#c4b5fd" }}>{v}</div>
                <div className="l-font-mono"    style={{ fontSize: ".6rem", color: "#44445a", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating orb graphic */}
      <div style={{ position: "absolute", right: "7%", top: "50%", transform: "translateY(-50%)", zIndex: 5, animation: "floatY 5s ease-in-out infinite" }}>
        <div style={{ width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%,rgba(124,58,237,.22),rgba(59,130,246,.1) 55%,transparent 78%)", border: "1px solid rgba(124,58,237,.22)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulseRing 4s ease-in-out infinite", position: "relative" }}>
          <div style={{ position: "absolute", inset: 22, borderRadius: "50%", border: "1px solid rgba(124,58,237,.13)" }} />
          <div style={{ position: "absolute", inset: 52, borderRadius: "50%", border: "1px solid rgba(59,130,246,.1)" }} />
          <span className="l-font-display" style={{ fontSize: "3.2rem", fontWeight: 800, background: "linear-gradient(135deg,#c4b5fd,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
        </div>
      </div>

      {/* Scroll cue */}
      <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", opacity: Math.max(0, 1 - sy / 110), transition: "opacity .3s", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 20 }}>
        <div style={{ width: 22, height: 34, borderRadius: 12, border: "1.5px solid rgba(124,58,237,.45)", display: "flex", justifyContent: "center", paddingTop: 6 }}>
          <div style={{ width: 3, height: 7, borderRadius: 2, background: "#9d5cf6", animation: "scrollB 1.8s ease-in-out infinite" }} />
        </div>
        <span className="l-font-mono" style={{ fontSize: ".52rem", color: "#44445a", letterSpacing: ".15em", textTransform: "uppercase" }}>SCROLL</span>
      </div>
    </section>
  );
}

function LandingMarquee() {
  return (
    <section style={{ padding: "5.5rem 0", borderTop: "1px solid rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
      <p className="l-font-mono" style={{ textAlign: "center", fontSize: ".6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#44445a", marginBottom: "2.5rem" }}>
        POWERED BY CUTTING-EDGE AI TECHNOLOGY
      </p>
      <div style={{ overflow: "hidden", maskImage: "linear-gradient(90deg,transparent 0%,black 8%,black 92%,transparent 100%)" }}>
        <div style={{ display: "flex", gap: "4rem", animation: "marquee 50s linear infinite", whiteSpace: "nowrap", flexShrink: 0 }}>
          {MARQUEE_ITEMS.map((item, i) => (
            <span key={i} className="l-font-display" style={{ fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", color: "rgba(136,136,168,.38)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4rem" }}>
              {item}
              <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "rgba(124,58,237,.45)" }} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingSteps() {
  const ref = useRef<HTMLElement>(null);
  const vis = useInView(ref);
  return (
    <section ref={ref} style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem" }}>
      <div style={{ marginBottom: "3.5rem", opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .7s both" : "none" }}>
        <div className="l-eyebrow" style={{ marginBottom: "1rem" }}>How It Works</div>
        <h2 className="l-font-display" style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, letterSpacing: "-.025em" }}>
          4단계로 완성되는<br /><span className="l-grad-text">AI 영상 제작</span>
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1.1rem" }}>
        {STEPS.map((s, i) => (
          <div key={s.num} className="l-cinema-card" style={{ padding: "1.75rem", opacity: vis ? 1 : 0, animation: vis ? `fadeUpL .7s ${0.1 + i * 0.1}s both` : "none" }}>
            <div className="l-font-mono" style={{ fontSize: "2rem", fontWeight: 700, color: "rgba(124,58,237,.22)", marginBottom: "1.25rem", lineHeight: 1 }}>{s.num}</div>
            <h3 className="l-font-display" style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f8", marginBottom: ".6rem", letterSpacing: "-.01em" }}>{s.title}</h3>
            <p style={{ fontSize: ".83rem", color: "#8888a8", lineHeight: 1.65, fontWeight: 300 }}>{s.desc}</p>
            <div style={{ marginTop: "1.5rem", height: 2, borderRadius: 2, background: `linear-gradient(90deg,rgba(124,58,237,${.38 + i * .16}),rgba(59,130,246,.28))`, width: `${48 + i * 13}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingSpecTable() {
  const ref = useRef<HTMLElement>(null);
  const vis = useInView(ref);
  return (
    <section ref={ref} style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: "3rem", opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .7s both" : "none" }}>
          <div className="l-eyebrow" style={{ marginBottom: "1rem" }}>Technical Specification</div>
          <h2 className="l-font-display" style={{ fontSize: "clamp(1.5rem,2.5vw,2rem)", fontWeight: 800, letterSpacing: "-.025em" }}>
            AI PIPELINE <span className="l-grad-text">ARCHITECTURE</span>
          </h2>
        </div>
        <div style={{ border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden", opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .7s .12s both" : "none" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 2fr", padding: ".85rem 1.5rem", background: "rgba(124,58,237,.06)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            {["COMPONENT", "ENGINE", "DETAIL"].map(c => (
              <span key={c} className="l-font-mono" style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".14em", color: "#9d5cf6", textTransform: "uppercase" }}>{c}</span>
            ))}
          </div>
          {SPECS.map((row, i) => (
            <div key={row.component}
              style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 2fr", padding: "1rem 1.5rem", borderBottom: i < SPECS.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", transition: "background .2s", cursor: "default" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span className="l-font-display" style={{ fontSize: ".88rem", fontWeight: 600, color: "#f0f0f8" }}>{row.component}</span>
              <span className="l-font-mono"    style={{ fontSize: ".76rem", color: "#c4b5fd", letterSpacing: ".03em" }}>{row.engine}</span>
              <span style={{ fontSize: ".82rem", color: "#8888a8", fontWeight: 300 }}>{row.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCTA({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const vis = useInView(ref);
  return (
    <section ref={ref} style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
        {/* Left */}
        <div style={{ opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .8s both" : "none" }}>
          <div className="l-eyebrow" style={{ marginBottom: "1.5rem" }}>Start Creating</div>
          <h2 className="l-font-display" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.03em", marginBottom: "1.25rem" }}>
            지금 바로<br /><span className="l-grad-text">첫 영상을</span><br />만들어보세요
          </h2>
          <p style={{ fontSize: ".9rem", color: "#8888a8", lineHeight: 1.75, marginBottom: "2rem", fontWeight: 300, maxWidth: 370 }}>
            이미지 한 장, 한 줄 설명이면 충분합니다.<br />AI가 나머지를 모두 처리합니다.
          </p>
          <button className="l-btn-cta" onClick={onStart} style={{ padding: "0 2.25rem", height: 52, fontSize: ".95rem" }}>
            무료로 시작하기  →
          </button>
        </div>

        {/* Right — mock terminal */}
        <div style={{ opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .8s .14s both" : "none" }}>
          <div className="l-cinema-card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {["#ef4444", "#f59e0b", "#10b981"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .7 }} />
              ))}
            </div>
            <div className="l-font-mono" style={{ fontSize: ".7rem", color: "#9d5cf6", marginBottom: ".75rem", letterSpacing: ".05em" }}>// AI PIPELINE STATUS</div>
            {PIPELINE_ITEMS.map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".58rem" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: item.done ? "rgba(16,185,129,.14)" : item.prog ? "rgba(124,58,237,.14)" : "rgba(100,100,120,.1)", border: `1px solid ${item.done ? "rgba(16,185,129,.4)" : item.prog ? "rgba(124,58,237,.4)" : "rgba(100,100,120,.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.done && <span style={{ fontSize: 9, color: "#10b981" }}>✓</span>}
                  {item.prog && <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "#7c3aed", animation: "spinL .8s linear infinite" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="l-font-mono" style={{ fontSize: ".63rem", color: item.done ? "#6ee7b7" : item.prog ? "#c4b5fd" : "#44445a", letterSpacing: ".06em" }}>{item.label}</div>
                  {item.prog && (
                    <div style={{ marginTop: 4, height: 2, background: "rgba(100,100,120,.2)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${(item.prog as number) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#3b82f6)", borderRadius: 2, boxShadow: "0 0 7px rgba(124,58,237,.7)" }} />
                    </div>
                  )}
                </div>
                {item.done && <span className="l-font-mono" style={{ fontSize: ".58rem", color: "#44445a" }}>2.1s</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  const vis = useInView(ref);
  return (
    <section ref={ref} style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: "3rem", opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .7s both" : "none" }}>
          <div className="l-eyebrow" style={{ marginBottom: "1rem" }}>FAQ</div>
          <h2 className="l-font-display" style={{ fontSize: "clamp(1.5rem,2.5vw,2rem)", fontWeight: 800, letterSpacing: "-.02em" }}>자주 묻는 질문</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".6rem", opacity: vis ? 1 : 0, animation: vis ? "fadeUpL .7s .1s both" : "none" }}>
          {FAQS.map((item, i) => (
            <div key={i} className="l-cinema-card" style={{ cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ padding: "1.1rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span className="l-font-display" style={{ fontSize: ".9rem", fontWeight: 600, color: open === i ? "#c4b5fd" : "#d0d0e8", letterSpacing: "-.01em" }}>{item.q}</span>
                <span style={{ fontSize: "1.2rem", color: open === i ? "#9d5cf6" : "#44445a", transition: "transform .3s,color .2s", transform: open === i ? "rotate(45deg)" : "none", flexShrink: 0 }}>+</span>
              </div>
              {open === i && (
                <div style={{ padding: "0 1.4rem 1.1rem", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                  <p style={{ fontSize: ".84rem", color: "#8888a8", lineHeight: 1.72, paddingTop: ".75rem", fontWeight: 300 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ onStart }: { onStart: () => void }) {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "3rem 2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <div className="l-font-display" style={{ fontSize: "1.05rem", fontWeight: 800, background: "linear-gradient(135deg,#c4b5fd,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI VIDEO GEN</div>
          <div className="l-font-mono"    style={{ fontSize: ".58rem", color: "#44445a", letterSpacing: ".12em", marginTop: 4, textTransform: "uppercase" }}>Generation Platform</div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["서비스 소개", "문의하기", "개인정보처리방침"].map(link => (
            <span key={link} style={{ fontSize: ".76rem", color: "#44445a", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#c4b5fd")}
              onMouseLeave={e => (e.currentTarget.style.color = "#44445a")}
            >{link}</span>
          ))}
        </div>
        <button className="l-btn-ghost" onClick={onStart} style={{ padding: "0 1.2rem", height: 38, fontSize: ".8rem" }}>시작하기  →</button>
      </div>
      <div style={{ maxWidth: 1100, margin: "1.5rem auto 0", borderTop: "1px solid rgba(255,255,255,.04)", paddingTop: "1.5rem" }}>
        <p className="l-font-mono" style={{ fontSize: ".56rem", color: "#1e1e2a", letterSpacing: ".08em", textTransform: "uppercase" }}>
          © 2025 AI Video Generation Platform · All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════
   SCREEN0 — LANDING PAGE
════════════════════════════════════════════════════ */
function Screen0({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ background: "#000", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{LANDING_CSS}</style>
      <div className="l-noise" />
      <LandingNav     onStart={onStart} />
      <main>
        <LandingHero      onStart={onStart} />
        <LandingMarquee   />
        <LandingSteps     />
        <LandingSpecTable />
        <LandingCTA       onStart={onStart} />
        <LandingFAQ       />
        <LandingFooter    onStart={onStart} />
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   APP CONTENT  (기존 flow 유지)
════════════════════════════════════════════════════ */
type ScreenType = "landing" | "input" | "preview" | "loading" | "result";

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("landing");

  // ── Screen 0: 랜딩 페이지
  if (currentScreen === "landing") {
    return <Screen0 onStart={() => setCurrentScreen("input")} />;
  }

  // ── Screen 1~4: 기존 앱 플로우
  return (
    <div className="cinema-bg" style={{ minHeight: "100vh", position: "relative" }}>

      {/* Cinematic ambient orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 70%)", filter: "blur(40px)", animation: "blob 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "30%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.08) 0%,transparent 70%)", filter: "blur(50px)", animation: "blob 25s ease-in-out infinite", animationDelay: "2s" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "30%", width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(124,58,237,.07) 0%,transparent 70%)", filter: "blur(60px)", animation: "blob 30s ease-in-out infinite", animationDelay: "4s" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.03) 1px,transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 100% 100% at 50% 0%,black 0%,transparent 80%)" }} />
      </div>

      {/* Step indicator */}
      <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", background: "rgba(10,10,16,.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.07)" }}>
        {(["input", "preview", "loading", "result"] as Exclude<ScreenType, "landing">[]).map((step, i) => {
          const labels = ["CHARACTER", "SCENARIO", "RENDER", "RESULT"];
          const order = ["input", "preview", "loading", "result"];
          const isCurrent = currentScreen === step;
          const isPast = order.indexOf(currentScreen) > i;
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {i > 0 && <div style={{ width: 16, height: 1, background: isPast ? "rgba(124,58,237,.5)" : "rgba(255,255,255,.07)", transition: "background .4s" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: isCurrent ? "var(--accent-violet)" : isPast ? "rgba(124,58,237,.5)" : "var(--text-muted)", boxShadow: isCurrent ? "0 0 8px var(--accent-violet)" : "none", transition: "background .4s,box-shadow .4s" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".55rem", letterSpacing: ".1em", textTransform: "uppercase", color: isCurrent ? "var(--text-accent)" : isPast ? "rgba(196,181,253,.5)" : "var(--text-muted)", transition: "color .4s" }}>{labels[i]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main screens */}
      <div className="relative" style={{ zIndex: 10, paddingTop: "60px", paddingBottom: "40px" }}>
        {currentScreen === "input" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Screen1 onNext={() => setCurrentScreen("preview")} />
          </div>
        )}
        {currentScreen === "preview" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <Screen2
              onEdit={() => setCurrentScreen("input")}
              onNext={() => setCurrentScreen("loading")}
            />
          </div>
        )}
        {currentScreen === "loading" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Screen3 onComplete={() => setCurrentScreen("result")} />
          </div>
        )}
        {currentScreen === "result" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Screen4
              onReset={() => setCurrentScreen("preview")}
              onRestart={() => setCurrentScreen("input")}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes blob {
          0%,100% { transform:translate(0,0) scale(1); }
          33%      { transform:translate(40px,-60px) scale(1.05); }
          66%      { transform:translate(-30px,30px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ROOT EXPORT
════════════════════════════════════════════════════ */
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}