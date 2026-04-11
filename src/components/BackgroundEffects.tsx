"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/* ═══ STARFIELD (dark mode) — Enhanced: mais estrelas + nebula + teal tones ═══ */
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface Star {
      x: number; y: number; r: number; a: number;
      sp: number; ts: number; to: number; c: string;
    }
    let stars: Star[] = [];
    let animId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function createStars() {
      stars = [];
      const w = canvas!.width;
      const h = canvas!.height;
      // 120 white stars — more visible
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.4 + 0.3, a: Math.random() * 0.5 + 0.2,
          sp: Math.random() * 0.15 + 0.02, ts: Math.random() * 0.012 + 0.003,
          to: Math.random() * Math.PI * 2, c: "200,210,230",
        });
      }
      // 18 orange glowing stars — more intense
      for (let i = 0; i < 18; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 2.0 + 0.8, a: Math.random() * 0.45 + 0.25,
          sp: Math.random() * 0.08 + 0.015, ts: Math.random() * 0.008 + 0.003,
          to: Math.random() * Math.PI * 2, c: "200,75,49",
        });
      }
      // 12 teal stars — matching the Allos icon
      for (let i = 0; i < 12; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.6 + 0.6, a: Math.random() * 0.4 + 0.2,
          sp: Math.random() * 0.07 + 0.015, ts: Math.random() * 0.006 + 0.003,
          to: Math.random() * Math.PI * 2, c: "43,158,139",
        });
      }
      // 8 warm amber stars
      for (let i = 0; i < 8; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.5 + 0.6, a: Math.random() * 0.35 + 0.2,
          sp: Math.random() * 0.06 + 0.015, ts: Math.random() * 0.006 + 0.003,
          to: Math.random() * Math.PI * 2, c: "218,108,52",
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const t = Date.now() * 0.001;
      for (const s of stars) {
        const tw = Math.sin(t * s.ts * 10 + s.to) * 0.3 + 0.7;
        const al = s.a * tw;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${s.c},${al})`;
        ctx!.fill();
        // Colored glow halo for non-white stars
        if (s.c !== "200,210,230") {
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${s.c},${al * 0.1})`;
          ctx!.fill();
        }
        s.y -= s.sp;
        if (s.y < -5) { s.y = canvas!.height + 5; s.x = Math.random() * canvas!.width; }
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    createStars();
    draw();

    const handleResize = () => { resize(); createStars(); };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

/* ═══ GOLDEN DUST (light mode) — warm orange particles ═══ */
function GoldenDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface Particle {
      x: number; y: number; r: number; a: number;
      sy: number; sx: number; ws: number; wa: number; wo: number;
      ts: number; to: number; cl: string; t: string;
      br?: number; st?: number; sd?: number; si?: number;
    }
    let particles: Particle[] = [];
    let animId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function createParticles() {
      particles = [];
      const w = canvas!.width;
      const h = canvas!.height;
      const cols = ["218,108,52", "200,75,49", "255,185,122", "168,61,39", "218,140,80"];

      // 50 dust particles
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.5 + 0.5, a: Math.random() * 0.2 + 0.06,
          sy: -(Math.random() * 0.12 + 0.03), sx: (Math.random() - 0.5) * 0.3,
          ws: Math.random() * 0.008 + 0.003, wa: Math.random() * 15 + 5,
          wo: Math.random() * Math.PI * 2,
          ts: Math.random() * 0.004 + 0.001, to: Math.random() * Math.PI * 2,
          cl: cols[Math.floor(Math.random() * cols.length)], t: "d",
        });
      }
      // 8 accent particles (larger, glow halo)
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 2.5 + 1.5, a: Math.random() * 0.12 + 0.06,
          sy: -(Math.random() * 0.08 + 0.02), sx: (Math.random() - 0.5) * 0.2,
          ws: Math.random() * 0.005 + 0.002, wa: Math.random() * 20 + 10,
          wo: Math.random() * Math.PI * 2,
          ts: Math.random() * 0.003 + 0.001, to: Math.random() * Math.PI * 2,
          cl: Math.random() > 0.3 ? "200,75,49" : "168,61,39", t: "a",
        });
      }
      // 5 sparkle particles
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1 + 0.5, br: Math.random() * 1 + 0.5,
          a: 0.04,
          sy: -(Math.random() * 0.06 + 0.02), sx: (Math.random() - 0.5) * 0.15,
          ws: Math.random() * 0.006 + 0.002, wa: Math.random() * 12 + 5,
          wo: Math.random() * Math.PI * 2,
          ts: Math.random() * 0.002 + 0.001, to: Math.random() * Math.PI * 2,
          st: Math.random() * 600, sd: 80, si: Math.random() * 400 + 200,
          cl: "218,108,52", t: "s",
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const tm = Date.now() * 0.001;

      for (const s of particles) {
        let tw = Math.sin(tm * s.ts * 10 + s.to) * 0.4 + 0.6;
        let al = s.a * tw;
        const wx = Math.sin(tm * s.ws * 5 + s.wo) * s.wa;
        let rd = s.t === "s" ? (s.br ?? s.r) : s.r;

        // Sparkle flash
        if (s.t === "s" && s.st !== undefined && s.si !== undefined && s.sd !== undefined) {
          s.st++;
          if (s.st > s.si) {
            const fp = (s.st - s.si) / s.sd;
            if (fp < 1) {
              const fi = fp < 0.3 ? fp / 0.3 : 1 - ((fp - 0.3) / 0.7);
              al += fi * 0.5;
              rd += fi * 2;
            } else {
              s.st = 0;
              s.si = Math.random() * 400 + 200;
            }
          }
        }

        const dx = s.x + wx;
        ctx!.beginPath();
        ctx!.arc(dx, s.y, rd, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${s.cl},${Math.min(al, 0.5)})`;
        ctx!.fill();

        // Glow halo for accent and bright sparkle
        if (s.t === "a" || (s.t === "s" && al > 0.15)) {
          ctx!.beginPath();
          ctx!.arc(dx, s.y, rd * 4, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${s.cl},${al * 0.12})`;
          ctx!.fill();
        }

        s.y += s.sy;
        s.x += s.sx;
        if (s.y < -10) { s.y = canvas!.height + 10; s.x = Math.random() * canvas!.width; }
        if (s.x < -20) s.x = canvas!.width + 20;
        if (s.x > canvas!.width + 20) s.x = -20;
        if (s.t === "s" && s.br !== undefined) {
          s.br = Math.max(s.br * 0.95, 0.5 + Math.random() * 1);
        }
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    const handleResize = () => { resize(); createParticles(); };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

/* ═══ MESH GRADIENT (light mode) ═══ */
function MeshGradient() {
  return (
    <div className="mesh-bg" aria-hidden="true">
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
    </div>
  );
}

/* ═══ PADRONAGEM OVERLAY — Red pattern (light) / White icons (dark) ═══ */
function PatternOverlay({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={{
        backgroundImage: isDark ? "url('/psicoterapeutas/padronagem-icons.png')" : "url('/psicoterapeutas/padronagem-red.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "200px auto",
        opacity: isDark ? 0.04 : 0.08,
      }}
    />
  );
}

/* ═══ PARALLAX WRAPPER ═══ */
function ParallaxCanvas({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mx = 0, my = 0;
    function handleMouse(e: MouseEvent) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    let animId: number;
    function applyParallax() {
      if (ref.current) {
        ref.current.style.transform = `translate(${mx * 4}px, ${my * 4}px)`;
      }
      animId = requestAnimationFrame(applyParallax);
    }
    document.addEventListener("mousemove", handleMouse);
    applyParallax();
    return () => {
      document.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}

/* ═══ MAIN EXPORT ═══ */
export default function BackgroundEffects() {
  const { theme } = useTheme();

  return (
    <>
      {/* Pattern overlay — different per theme */}
      <PatternOverlay isDark={theme === "dark"} />

      {theme === "dark" ? (
        <>
          <ParallaxCanvas>
            <Starfield />
          </ParallaxCanvas>
          {/* Ambient glow (top) */}
          <div className="ambient-glow" aria-hidden="true" />
          {/* Nebula glow (bottom) — novo */}
          <div className="nebula-glow" aria-hidden="true" />
        </>
      ) : (
        <>
          <ParallaxCanvas>
            <GoldenDust />
          </ParallaxCanvas>
          <MeshGradient />
        </>
      )}
    </>
  );
}
