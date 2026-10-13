// Small original inline icons. Decorative: always aria-hidden, the text next to them carries the meaning.

import type { ReactNode } from "react";

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const WrenchIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
  </Icon>
);

export const CameraIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const TagIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="8.5" r="1.2" />
  </Icon>
);

export const ScaleIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 4v16M6 20h12M5 7h14" />
    <path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
  </Icon>
);

export const ChartIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
  </Icon>
);

export const DocIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5M10 13h6M10 17h6" />
  </Icon>
);

export const HomeIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10M10 20v-6h4v6" />
  </Icon>
);

export const KeyIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9M16 7l3 3M14 9l2 2" />
  </Icon>
);

export const AlertIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18.5v.1" />
  </Icon>
);

export const CheckIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Icon>
);

export const ShieldIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M8.5 12l2.5 2.5L15.5 10" />
  </Icon>
);

export const ChatIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  </Icon>
);

export const SparkIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </Icon>
);
