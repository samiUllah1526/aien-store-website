import { useMemo } from 'react';

export interface AnnouncementBarItem {
  text: string;
}

export interface AnnouncementBarProps {
  items: AnnouncementBarItem[];
}

const SEPARATOR = '  ·  ';

export default function AnnouncementBar({ items }: AnnouncementBarProps) {
  const messages = useMemo(
    () => items.map((item) => item.text).filter(Boolean),
    [items],
  );

  if (messages.length === 0) return null;

  const singleMessage = messages.length === 1;
  const marqueeText = singleMessage ? messages[0] : messages.join(SEPARATOR);

  return (
    <div
      className="relative overflow-hidden border-b border-mehndi/40 bg-charcoal/95 text-off-white"
      role="region"
      aria-live={singleMessage ? 'off' : 'polite'}
      aria-label="Announcement"
    >
      <div className="flex min-h-[2.75rem] items-center py-2">
        {singleMessage ? (
          <p className="w-full text-center text-[11px] font-medium uppercase tracking-[0.22em] text-off-white/90 sm:text-xs">
            {marqueeText}
          </p>
        ) : (
          <div className="w-full overflow-hidden">
            <div
              className="announcement-marquee-track inline-flex flex-none items-center gap-8 whitespace-nowrap py-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-off-white/90 sm:text-xs"
            >
              <span>{marqueeText}</span>
              <span>{marqueeText}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
