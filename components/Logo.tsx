// Porchlight mark: a wall lantern with a warm glow. Original artwork.

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle cx="20" cy="22" r="16" fill="#F5A524" opacity="0.22" />
      <circle cx="20" cy="22" r="11" fill="#F5A524" opacity="0.3" />
      <rect x="17" y="4" width="6" height="4" rx="1.5" fill="#1F2A44" />
      <path d="M12 10h16l-2.5 4h-11z" fill="#1F2A44" />
      <rect x="14.5" y="14" width="11" height="15" rx="2" fill="#FFE2A3" stroke="#1F2A44" strokeWidth="2" />
      <circle cx="20" cy="21.5" r="3.4" fill="#F5A524" />
      <rect x="12" y="29" width="16" height="3.5" rx="1.5" fill="#1F2A44" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight text-ink">Porchlight</span>
    </span>
  );
}
