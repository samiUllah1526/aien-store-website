/**
 * Renders a color swatch circle (and optional label) for e‑commerce style color display.
 * Shows the actual color in a circle when the value is a hex code; otherwise a neutral circle + label.
 */

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 4 && trimmed.startsWith('#')) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return trimmed;
}

export interface ColorSwatchProps {
  /** Color value: hex (e.g. #fff or #ffffff) or display name. */
  color: string;
  /** Size of the circle. */
  size?: 'sm' | 'md' | 'lg';
  /** Show the color text next to the swatch. */
  showLabel?: boolean;
  /** Optional class for the wrapper. */
  className?: string;
  /** Accessible label (e.g. "Color: White"). */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 min-w-[1rem] min-h-[1rem]',
  md: 'w-6 h-6 min-w-[1.5rem] min-h-[1.5rem]',
  lg: 'w-8 h-8 min-w-[2rem] min-h-[2rem]',
};

export default function ColorSwatch({
  color,
  size = 'md',
  showLabel = false,
  className = '',
  ariaLabel,
}: ColorSwatchProps) {
  const isHex = isHexColor(color);
  const style = isHex ? { backgroundColor: normalizeHex(color) } : undefined;

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      title={color}
      aria-label={ariaLabel ?? (showLabel ? undefined : `Color: ${color}`)}
    >
      <span
        className={`shrink-0 rounded-full border border-ash/30 ${sizeClasses[size]} ${
          !style ? 'bg-ash/20' : ''
        }`}
        style={style}
        aria-hidden
      />
      {showLabel && <span>{color}</span>}
    </span>
  );
}
