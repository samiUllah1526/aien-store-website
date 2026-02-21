/**
 * Lenis smooth scroll — inertia, no sharp jumps.
 * Initializes on mount; applies to document.
 */

import { useEffect, useRef } from 'react';

export default function SmoothScroll() {
  const lenisRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let rafId: number | undefined;
    const init = async () => {
      const Lenis = (await import('lenis')).default;
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenisRef.current = lenis;
      function raf(time: number) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    };
    init();
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      lenisRef.current?.destroy();
    };
  }, []);

  return null;
}
