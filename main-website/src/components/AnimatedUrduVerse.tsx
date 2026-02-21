/**
 * Animated Urdu verse for product page.
 * Fade in with gentle motion — poetry as motion, not static.
 */

import { motion } from 'framer-motion';

interface AnimatedUrduVerseProps {
  verse: string;
  transliteration?: string | null;
}

export default function AnimatedUrduVerse({
  verse,
  transliteration,
}: AnimatedUrduVerseProps) {
  const lines = verse.split('\n').filter(Boolean);

  return (
    <div className="mb-10">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            delay: i * 0.25,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="urdu-text text-2xl md:text-3xl text-soft-charcoal dark:text-off-white leading-loose font-urdu mt-4 first:mt-0"
        >
          {line}
        </motion.p>
      ))}
      {transliteration && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1,
            delay: lines.length * 0.25 + 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="mt-4 text-ash text-sm italic"
        >
          {transliteration}
        </motion.p>
      )}
    </div>
  );
}
