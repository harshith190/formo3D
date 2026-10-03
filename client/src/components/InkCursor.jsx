import { useEffect, useRef } from 'react';

// Liquid ink trail that follows the mouse and inverts whatever it passes over.
// White blobs are drawn on a black canvas; CSS blur + contrast melts them into one
// gooey shape, and mix-blend-mode: difference turns white into "invert" and black into "no change".
// Off for touch screens and reduced motion. The loop sleeps when the trail has faded.
export default function InkCursor() {
  const ref = useRef();

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const S = 0.5; // render at half resolution; the blur hides it
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.width = Math.ceil(window.innerWidth * S);
      h = canvas.height = Math.ceil(window.innerHeight * S);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
    };
    resize();

    const blobs = [];
    let last = null;
    let raf = 0;
    let running = false;

    const frame = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        b.r *= b.decay;
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.92;
        b.vy *= 0.92;
        if (b.r < 0.8) { blobs.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(b.x * S, b.y * S, b.r * S, 0, Math.PI * 2);
        ctx.fill();
      }
      if (blobs.length) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      if (last) {
        const dx = x - last.x, dy = y - last.y;
        const dist = Math.hypot(dx, dy);
        const speed = Math.min(dist, 140);
        const steps = Math.min(10, Math.ceil(dist / 12));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const px = last.x + dx * t, py = last.y + dy * t;
          // Main body: bigger when you move faster.
          blobs.push({ x: px, y: py, r: 18 + speed * 0.5 * (0.6 + Math.random() * 0.7), vx: dx * 0.015, vy: dy * 0.015, decay: 0.935 + Math.random() * 0.03 });
          // Splatter droplets give the torn, inky edge.
          if (Math.random() < 0.65) {
            const a = Math.random() * Math.PI * 2, d = speed * (0.4 + Math.random() * 0.6);
            blobs.push({ x: px + Math.cos(a) * d, y: py + Math.sin(a) * d, r: 4 + Math.random() * 14, vx: 0, vy: 0, decay: 0.92 + Math.random() * 0.04 });
          }
        }
        if (blobs.length > 500) blobs.splice(0, blobs.length - 500);
      }
      last = { x, y };
      if (!running && blobs.length) { running = true; raf = requestAnimationFrame(frame); }
    };
    const onLeave = () => { last = null; };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="ink" aria-hidden="true" />;
}
