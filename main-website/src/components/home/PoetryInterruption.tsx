/**
 * Poetry interruption: full-screen Urdu poetry.
 * Acts as a pause. No navigation, no CTA within the section.
 */

import { useState, useEffect, useRef } from 'react';

const POETRY_VERSE = 'دل میں اک آگ سی لگی ہوئی ہے\nتم ہی بتاؤ کہ یہ کیسے بجھے';

export default function PoetryInterruption() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => ref.current && observer.unobserve(ref.current);
  }, []);

  return (
    <section
      ref={ref}
      className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 bg-ink/5 dark:bg-ash/5"
      aria-label="Poetry"
    >
      <div
        className={`max-w-3xl mx-auto text-center transition-opacity duration-1000 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="urdu-text text-urdu-hero text-soft-charcoal dark:text-off-white leading-[1.8] whitespace-pre-line">
          {POETRY_VERSE}
        </p>
      </div>
    </section>
  );
}
