"use client";

// Fades its content in once, the first time it scrolls into view. With reduced motion, or without IntersectionObserver,
// it is simply shown. The content is in the page either way, so nothing is hidden from search or screen readers.

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FadeIn({ children, delayMs = 0, className = "" }: { children: ReactNode; delayMs?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delayMs}ms` : "0ms" }}
      className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}
