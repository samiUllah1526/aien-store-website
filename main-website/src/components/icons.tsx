/**
 * Inline SVG icons for chrome / UI — no Material Symbols webfont flash.
 * Stroke weight matches the editorial 1.5 outline style used elsewhere.
 */

import type { ReactNode } from 'react';

type IconProps = {
  className?: string;
  /** Default 24; pass larger for hero/status marks. */
  size?: number;
};

const defaults = 'w-6 h-6 shrink-0';

function Svg({
  className = defaults,
  size,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className || defaults}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.5 };

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M6 18L18 6M6 6l12 12" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </Svg>
  );
}

export function IconTune(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M4 6h16M6 12h12M9 18h6" />
    </Svg>
  );
}

export function IconExpandMore(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M19 9l-7 7-7-7" />
    </Svg>
  );
}

export function IconExpandLess(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M5 15l7-7 7 7" />
    </Svg>
  );
}

export function IconArrowForward(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconAdd(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconRemove(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M5 12h14" />
    </Svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
      />
      <path {...stroke} d="M8.5 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4 16l5-5 3 3 4-4 4 4" />
    </Svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
  );
}

export function IconError(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3M5.25 10.5h13.5v9.75H5.25V10.5z"
      />
    </Svg>
  );
}

export function IconTruck(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v1.5m0 0h4.086c.36 0 .696.176.9.468l2.214 3.182A1.125 1.125 0 0121.75 11.4v5.225c0 .621-.504 1.125-1.125 1.125H18.75m-2.25-9.75v6.375m0 0a1.5 1.5 0 103 0m-3 0a1.5 1.5 0 013 0"
      />
    </Svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path {...stroke} d="M6 6h.008v.008H6V6z" />
    </Svg>
  );
}

export function IconPayments(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </Svg>
  );
}

export function IconBank(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M12 3l9 4.5v2.25H3V7.5L12 3zM4.5 12v6M9 12v6M15 12v6M19.5 12v6M3 21h18"
      />
    </Svg>
  );
}
