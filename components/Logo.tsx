// GoHome mark: a house with a glowing door, on a rounded blue tile. Original artwork.

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="shrink-0">
      <rect width="40" height="40" rx="11" fill="#1D4ED8" />
      <path d="M8.5 19.5 20 9l11.5 10.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18.5V30h16V18.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <rect x="17" y="21.5" width="6" height="8.5" rx="1.6" fill="#F97316" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>GoHome</span>
    </span>
  );
}
