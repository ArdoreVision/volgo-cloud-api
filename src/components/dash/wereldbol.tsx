import { useEffect, useRef } from "react";

/**
 * A calm, modern globe for the dashboard home: a sphere of dots that slowly turns,
 * with soft pulses where "new leads" light up. Pure canvas, no libraries.
 */
export function Wereldbol({ maat = 260 }: { maat?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = maat * dpr;
    canvas.height = maat * dpr;
    ctx.scale(dpr, dpr);

    // Evenly spread dots on a sphere (Fibonacci lattice), thinned out to suggest land masses.
    const N = 1400;
    const punten: [number, number, number][] = [];
    const gouden = Math.PI * (3 - Math.sqrt(5));
    const land = (lat: number, lon: number) =>
      Math.sin(lon * 1.7 + 0.6) * Math.cos(lat * 2.3) + Math.sin(lat * 3.1 + lon * 0.9) * 0.6 + Math.cos(lon * 3.3 - lat) * 0.35 > 0.15;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = gouden * i;
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      if (land(Math.asin(y), Math.atan2(z, x))) punten.push([x, y, z]);
    }
    // A few "lead" pulses at fixed places on the globe.
    const pings = Array.from({ length: 7 }, (_, i) => {
      const p = punten[(i * 197 + 41) % punten.length]!;
      return { p, fase: i * 0.9 };
    });

    // Colour follows day or night mode (read again every second).
    let kleur = "22, 119, 217";
    let gelezen = 0;
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const R = maat * 0.42;
    const cx = maat / 2;
    const cy = maat / 2;
    const kanteling = 0.38;
    let hoek = 0;
    let raf = 0;
    let laatst = performance.now();

    const teken = (nu: number) => {
      if (nu - gelezen > 1000) {
        gelezen = nu;
        kleur = getComputedStyle(canvas).getPropertyValue("--bol").trim() || kleur;
      }
      const dt = Math.min(64, nu - laatst);
      laatst = nu;
      if (!rustig) hoek += dt * 0.00012;
      ctx.clearRect(0, 0, maat, maat);

      // Soft halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.25);
      halo.addColorStop(0, `rgba(${kleur}, 0.10)`);
      halo.addColorStop(1, `rgba(${kleur}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, maat, maat);

      const cosA = Math.cos(hoek);
      const sinA = Math.sin(hoek);
      const cosK = Math.cos(kanteling);
      const sinK = Math.sin(kanteling);
      const proj = ([x, y, z]: [number, number, number]) => {
        const x1 = x * cosA + z * sinA;
        const z1 = -x * sinA + z * cosA;
        const y2 = y * cosK - z1 * sinK;
        const z2 = y * sinK + z1 * cosK;
        return [cx + x1 * R, cy - y2 * R, z2] as const;
      };

      // Faint outline
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${kleur}, 0.14)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      for (const p of punten) {
        const [sx, sy, z] = proj(p);
        if (z < -0.15) continue;
        const a = Math.max(0, (z + 0.15) / 1.15);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + a * 1.05, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${kleur}, ${0.12 + a * 0.75})`;
        ctx.fill();
      }

      for (const g of pings) {
        const [sx, sy, z] = proj(g.p);
        if (z < 0.05) continue;
        const t = ((nu / 1000 + g.fase) % 2.6) / 2.6;
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + t * 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 197, 94, ${(1 - t) * 0.55 * z})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${0.5 + z * 0.5})`;
        ctx.fill();
      }
      if (!rustig) raf = requestAnimationFrame(teken);
    };
    raf = requestAnimationFrame(teken);
    return () => cancelAnimationFrame(raf);
  }, [maat]);

  return <canvas aria-hidden="true" className="v-bol" ref={ref} style={{ width: maat, height: maat }} />;
}
