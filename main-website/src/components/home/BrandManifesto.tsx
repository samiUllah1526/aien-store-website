/**
 * Brand manifesto: gentle parallax, soft fade-in.
 * Minimal but alive.
 */

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const MANIFESTO_EN = 'We make garments that hold silence. Where poetry meets fabric, and loss meets wear.';
const MANIFESTO_URDU = 'الفاظ اور کپڑے کے درمیان ایک خاموش جگہ';

export default function BrandManifesto() {
  const ref = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [40, 0, 0, -20]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      if (v > 0.1 && !hasAnimated) setHasAnimated(true);
    });
    return unsubscribe;
  }, [scrollYProgress, hasAnimated]);

  return (
    <section
      ref={ref}
      className="py-32 md:py-44 px-4 sm:px-6 min-h-[60vh] flex flex-col justify-center"
      aria-label="Our philosophy"
    >
      <motion.div
        style={{ y, opacity }}
        className="max-w-prose mx-auto text-center space-y-10"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-display text-xl md:text-2xl text-soft-charcoal dark:text-off-white/95 leading-relaxed"
        >
          {MANIFESTO_EN}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="urdu-text text-lg md:text-xl text-ash"
        >
          {MANIFESTO_URDU}
        </motion.p>
      </motion.div>
    </section>
  );
}
