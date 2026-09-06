"use client";

import { useEffect, useRef } from "react";

/**
 * Nebula atmosphere: lightweight 2D canvas (no dependencies), faithful to
 * the "background" preset of nebula-atmosfera.js: diagonal dust band shifted
 * down, stars with depth/twinkle/extinction, closed exposure, parallax with
 * lerp 0.08 and mouse repulsion. Pauses when the tab is hidden and freezes
 * under prefers-reduced-motion. The CSS layers (.atmo-*) live in nebula.css
 * as reinforcement/fallback.
 */
export function NebulaAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const MIST = [133, 143, 163] as const;
    const MIST_GLOW = [209, 217, 235] as const;
    const DUST_EDGE = [140, 153, 173] as const;
    const DUST_CORE = [242, 247, 255] as const;
    const STAR = [204, 212, 230] as const;
    const STAR_FAR = [92, 100, 115] as const;
    const EXPOSICAO = 0.55;
    const LERP_MOUSE = 0.08;

    let W = 0;
    let H = 0;
    type Dust = { x: number; y: number; r: number; a: number; vx: number; vy: number; wob: number };
    type Star = { x: number; y: number; depth: number; r: number; a: number; phase: number; freq: number };
    type Wisp = { x: number; y: number; r: number; a: number; vx: number; wob: number };
    let dust: Dust[] = [];
    let stars: Star[] = [];
    let wisps: Wisp[] = [];

    function makeSprite(size: number, stops: ReadonlyArray<readonly [number, readonly number[], number]>) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      if (!g) return c;
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      for (const [t, col, a] of stops) grad.addColorStop(t, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }
    const dustSprite = makeSprite(64, [
      [0, DUST_CORE, 0.9],
      [0.3, DUST_EDGE, 0.45],
      [1, DUST_EDGE, 0],
    ]);
    const starNearSprite = makeSprite(32, [
      [0, STAR, 1],
      [0.25, STAR, 0.9],
      [1, STAR, 0],
    ]);
    const starFarSprite = makeSprite(32, [
      [0, STAR_FAR, 0.9],
      [0.5, STAR_FAR, 0.35],
      [1, STAR_FAR, 0],
    ]);
    const wispSprite = makeSprite(256, [
      [0, MIST_GLOW, 0.55],
      [0.4, MIST, 0.28],
      [1, MIST, 0],
    ]);

    const SLOPE = 0.3;
    const bandCenterY = (x: number) => H * 0.66 + SLOPE * (x - W / 2);
    const bandSpread = () => H * 0.15;
    const gauss = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;

    function populate() {
      const nDust = Math.round((W * H) / 4200);
      dust = Array.from({ length: nDust }, () => {
        const x = Math.random() * W;
        return {
          x,
          y: bandCenterY(x) + gauss() * bandSpread(),
          r: 6 + Math.random() * 26,
          a: 0.1 + Math.random() * 0.3,
          vx: -(2 + Math.random() * 5),
          vy: -(0.5 + Math.random() * 1.5),
          wob: Math.random() * Math.PI * 2,
        };
      });
      const nStars = Math.round((W * H) / 6500);
      stars = Array.from({ length: nStars }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          depth,
          r: 0.6 + depth * 1.6 + Math.random() * Math.random() * 1.4,
          a: 0.35 + Math.random() * 0.65,
          phase: Math.random() * Math.PI * 2,
          freq: 0.6 + Math.random() * 2.0,
        };
      });
      wisps = Array.from({ length: 7 }, (_, i) => {
        const x = (i / 6) * W + gauss() * W * 0.08;
        return {
          x,
          y: bandCenterY(x) + gauss() * bandSpread() * 1.6,
          r: W * (0.16 + Math.random() * 0.14),
          a: 0.05 + Math.random() * 0.06,
          vx: -(1 + Math.random() * 2),
          wob: Math.random() * Math.PI * 2,
        };
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      populate();
    }
    window.addEventListener("resize", resize);
    resize();

    const mouse = { x: -9999, y: -9999 };
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      par.tx = (e.clientX / W - 0.5) * 2;
      par.ty = (e.clientY / H - 0.5) * 2;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    let last = 0;
    function frame(now: number) {
      const t = now / 1000;
      const dt = Math.min((now - last) / 1000 || 0.016, 0.05);
      last = now;

      par.x += (par.tx - par.x) * LERP_MOUSE;
      par.y += (par.ty - par.y) * LERP_MOUSE;

      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";

      for (const w of wisps) {
        w.x += w.vx * dt;
        if (w.x < -w.r) w.x = W + w.r;
        const breathe = 0.85 + 0.15 * Math.sin(t * 0.24 + w.wob);
        const px = w.x + par.x * 6;
        const py = w.y + par.y * 4;
        ctx!.globalAlpha = w.a * breathe * EXPOSICAO;
        ctx!.drawImage(wispSprite, px - w.r, py - w.r, w.r * 2, w.r * 2);
      }

      for (const d of dust) {
        d.x += d.vx * dt;
        d.y += d.vy * dt + Math.sin(t * 0.5 + d.wob) * 0.08;
        const mdx = d.x - mouse.x;
        const mdy = d.y - mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        let boost = 0;
        if (md2 < 14400) {
          const md = Math.sqrt(md2) || 1;
          const f = (1 - md / 120) * 60 * dt;
          d.x += (mdx / md) * f;
          d.y += (mdy / md) * f;
          boost = (1 - md / 120) * 0.25;
        }
        if (d.x < -40) {
          d.x = W + 40;
          d.y = bandCenterY(d.x) + gauss() * bandSpread();
        }
        if (d.y < -40) d.y = H + 40;
        const px = d.x + par.x * 10;
        const py = d.y + par.y * 7;
        ctx!.globalAlpha = (d.a + boost) * EXPOSICAO * 0.55;
        ctx!.drawImage(dustSprite, px - d.r, py - d.r, d.r * 2, d.r * 2);
      }

      for (const s of stars) {
        const drift = 0.4 + 1.1 * s.depth;
        s.x += drift * 1.6 * dt;
        s.y += drift * 2.6 * dt;
        if (s.x > W + 4) s.x = -4;
        if (s.y > H + 4) s.y = -4;
        const tw = 0.7 + 0.3 * Math.sin(t * s.freq + s.phase);
        const distBand = Math.abs(s.y - bandCenterY(s.x)) / bandSpread();
        const extinction = 1 - 0.6 * Math.exp(-distBand * distBand * 0.8);
        const px = s.x + par.x * (4 + 18 * s.depth);
        const py = s.y + par.y * (3 + 12 * s.depth);
        const size = s.r * (s.depth > 0.5 ? 4 : 6);
        ctx!.globalAlpha = s.a * tw * (0.35 + 0.65 * s.depth) * extinction * EXPOSICAO * 1.4;
        ctx!.drawImage(s.depth > 0.5 ? starNearSprite : starFarSprite, px - size / 2, py - size / 2, size, size);
      }

      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    const semMovimento = matchMedia("(prefers-reduced-motion: reduce)");
    let raf: number | null = null;
    const loop = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(loop);
    };
    const pausar = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const retomar = () => {
      if (raf === null) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const sincronizar = () => {
      if (semMovimento.matches || document.hidden) pausar();
      else retomar();
    };
    semMovimento.addEventListener("change", sincronizar);
    document.addEventListener("visibilitychange", sincronizar);

    if (semMovimento.matches) frame(8000);
    else retomar();

    return () => {
      pausar();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      semMovimento.removeEventListener("change", sincronizar);
      document.removeEventListener("visibilitychange", sincronizar);
    };
  }, []);

  return (
    <>
      <div className="atmo" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      <div className="atmo-overlay atmo-mist" aria-hidden="true" />
      <div className="atmo-overlay atmo-veil" aria-hidden="true" />
      <div className="atmo-overlay atmo-grain" aria-hidden="true" />
      <div className="atmo-overlay atmo-vignette" aria-hidden="true" />
    </>
  );
}
