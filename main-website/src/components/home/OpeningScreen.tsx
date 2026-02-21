/**
 * Opening screen: full viewport, one large Urdu verse centered.
 * Minimal scroll indicator. No CTA.
 */

import { useState, useEffect } from 'react';

const OPENING_VERSE = 'عشق نے غلام بنایا اور ہم\nآزاد ہیں مگر وہیں کھڑے ہیں';

export default function OpeningScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setTimeout(() => setVisible(true), 100));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center items-center px-4 sm:px-6"
      aria-label="Opening"
    >
      <div
        className={`max-w-3xl mx-auto text-center transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="urdu-text text-urdu-hero text-soft-charcoal dark:text-off-white leading-[1.8] whitespace-pre-line">
          {OPENING_VERSE}
        </p>
      </div>
      <div
        className={`absolute bottom-12 left-1/2 -translate-x-1/2 transition-opacity duration-1000 delay-800 ${visible ? 'opacity-60' : 'opacity-0'}`}
        aria-hidden
      >
        <span className="block w-px h-12 bg-soft-charcoal/50 dark:bg-off-white/50 animate-pulse" />
      </div>
    </section>
  );
}
