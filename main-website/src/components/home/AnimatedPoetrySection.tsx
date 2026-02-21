/**
 * Poetry section: Urdu verses animate in, never static dump.
 * Treat poetry as motion.
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const POETRY_LINES = [
  'دل میں اک آگ سی لگی ہوئی ہے',
  'تم ہی بتاؤ کہ یہ کیسے بجھے',
];

interface AnimatedPoetrySectionProps {
  /** Optional custom lines (each animates in) */
  lines?: string[];
  /** Show without English translation */
  translation?: string | null;
}

export default function AnimatedPoetrySection({
  lines = POETRY_LINES,
  translation = null,
}: AnimatedPoetrySectionProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => ref.current && observer.unobserve(ref.current);
  }, []);

  return (
    <section
      ref={ref}
      className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 py-24 bg-ink/5 dark:bg-ash/5"
      aria-label="Poetry"
    >
      <div className="max-w-3xl mx-auto text-center">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 24 }}
            animate={
              visible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 24 }
            }
            transition={{
              duration: 1.2,
              delay: visible ? i * 0.4 : 0,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="urdu-text text-urdu-hero text-soft-charcoal dark:text-off-white leading-[1.8] mt-4 first:mt-0"
          >
            {line}
          </motion.p>
        ))}
        {translation && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 0.6 } : { opacity: 0 }}
            transition={{
              duration: 1,
              delay: visible ? lines.length * 0.4 + 0.3 : 0,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="mt-8 text-ash text-sm italic"
          >
            {translation}
          </motion.p>
        )}
      </div>
    </section>
  );
}
