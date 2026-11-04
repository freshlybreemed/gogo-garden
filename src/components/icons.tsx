import type { SVGProps } from 'react';

// Hard-edged, square-capped icons drawn on a 24px grid to match the flyer type.
type P = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconPlay = (p: P) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconPause = (p: P) => (
  <Icon {...p}>
    <path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconNext = (p: P) => (
  <Icon {...p}>
    <path d="M5 5v14l10-7z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </Icon>
);

export const IconPrev = (p: P) => (
  <Icon {...p}>
    <path d="M19 5v14L9 12z" fill="currentColor" stroke="none" />
    <path d="M6 5v14" />
  </Icon>
);

function Thirty({ x }: { x: number }) {
  return (
    <text
      x={x}
      y="15.6"
      textAnchor="middle"
      fontSize="7.5"
      fontWeight="800"
      fill="currentColor"
      stroke="none"
      fontFamily="var(--font-body), sans-serif"
    >
      30
    </text>
  );
}

export const IconBack30 = (p: P) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M3.5 4.5v5h5" />
    <path d="M4.3 9.5A8.5 8.5 0 1 1 5.5 17" />
    <Thirty x={12.8} />
  </Icon>
);

export const IconFwd30 = (p: P) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M20.5 4.5v5h-5" />
    <path d="M19.7 9.5A8.5 8.5 0 1 0 18.5 17" />
    <Thirty x={11.2} />
  </Icon>
);

export const IconSpeaker = (p: P) => (
  <Icon {...p}>
    <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" stroke="none" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </Icon>
);

export const IconMuted = (p: P) => (
  <Icon {...p}>
    <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" stroke="none" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Icon>
);

export const IconQueue = (p: P) => (
  <Icon {...p}>
    <path d="M3 6h13M3 11h13M3 16h7" />
    <path d="M14 13.5v7l6-3.5z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconCrate = (p: P) => (
  <Icon {...p}>
    <path d="M3 10h18v10H3z" />
    <path d="M8 14h8" />
    <path d="M6 10V4h5v6M13 10V3h5v7" />
  </Icon>
);

export const IconSearch = (p: P) => (
  <Icon {...p}>
    <path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z" />
    <path d="M15.5 15.5L20.5 20.5" />
  </Icon>
);

export const IconHome = (p: P) => (
  <Icon {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);

export const IconBands = (p: P) => (
  <Icon {...p}>
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
  </Icon>
);

export const IconClose = (p: P) => (
  <Icon {...p}>
    <path d="M5 5l14 14M19 5L5 19" />
  </Icon>
);

export const IconChevronDown = (p: P) => (
  <Icon {...p}>
    <path d="M5 9l7 7 7-7" />
  </Icon>
);

export const IconUser = (p: P) => (
  <Icon {...p}>
    <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6" />
  </Icon>
);

export const IconPin = (p: P) => (
  <Icon {...p} strokeWidth={0}>
    <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5C4.5 15 12 22 12 22s7.5-7 7.5-12.5A7.5 7.5 0 0 0 12 2z" fill="currentColor" />
  </Icon>
);

export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Icon {...p}>
    <path
      d="M12 20.5 3.8 12.6A4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 8.2 6.2z"
      fill={filled ? 'currentColor' : 'none'}
      strokeLinecap="butt"
    />
  </Icon>
);
