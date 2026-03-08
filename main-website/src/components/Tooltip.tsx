import type { ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom';

interface TooltipProps {
  content?: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
  bubbleClassName?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'bottom',
  className = '',
  bubbleClassName = '',
}: TooltipProps) {
  const showTooltip = Boolean(content);

  const bubblePositionClasses =
    position === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  const arrowPositionClasses =
    position === 'top'
      ? 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2'
      : 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2';

  return (
    <span className={`relative inline-flex group ${className}`.trim()}>
      {children}
      {showTooltip ? (
        <span
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-soft-charcoal px-2 py-1 text-xs text-bone opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 dark:bg-off-white dark:text-charcoal ${bubblePositionClasses} ${bubbleClassName}`.trim()}
        >
          <span
            className={`absolute h-2 w-2 rotate-45 bg-soft-charcoal dark:bg-off-white ${arrowPositionClasses}`.trim()}
          />
          {content}
        </span>
      ) : null}
    </span>
  );
}
