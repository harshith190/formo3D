import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out', duration: 0.9 });
if (import.meta.env.DEV) {
  window.__gsap = gsap;
  window.__ST = ScrollTrigger;
}

const mq = (q) => typeof window !== 'undefined' && window.matchMedia(q).matches;
export const reducedMotion = () => mq('(prefers-reduced-motion: reduce)');
// Phones and touch devices get shorter, simpler motion: no scrubbing, no tilt.
export const lightMotion = () => reducedMotion() || mq('(max-width: 767px), (pointer: coarse)');

export { gsap, ScrollTrigger };

/**
 * Fades and lifts every [data-reveal] element inside `ref` as it scrolls into view.
 * data-reveal="stagger" on a parent staggers its direct children instead.
 */
export function useReveal(ref, deps = []) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      if (reducedMotion()) return;
      const light = lightMotion();
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        const targets = el.dataset.reveal === 'stagger' ? el.children : el;
        gsap.from(targets, {
          y: light ? 18 : 36,
          opacity: 0,
          duration: light ? 0.6 : 1,
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      gsap.utils.toArray('[data-lines]').forEach((el) => {
        gsap.from(el.querySelectorAll('.ln > span'), {
          yPercent: 110,
          duration: light ? 0.7 : 1.1,
          ease: 'power4.out',
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
