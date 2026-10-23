// GoHome mark: the app icon in public/logo.png. Replace that file to change it everywhere.

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
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
