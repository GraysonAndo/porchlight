// Plain CSS bars. No chart library.

import { rangeBarScale } from "@/lib/quote";
import { usd } from "@/lib/format";
import type { LifeTone } from "@/lib/life";
import type { PriceRange } from "@/lib/types";

/** The market range as a green band, with the quote shown as a marker on it. */
export function RangeBar({ amount, range, label = "Quote" }: { amount: number; range: PriceRange; label?: string }) {
  const scale = rangeBarScale(amount, range);
  const markerLeft = Math.min(Math.max(scale.markerPct, 12), 88);
  const position =
    amount > range.high ? "above" : amount < range.low ? "below" : "inside";

  return (
    <div
      role="img"
      aria-label={`${label} ${usd(amount)} is ${position} the typical range of ${usd(range.low)} to ${usd(range.high)}`}
      className="pt-9"
    >
      <div className="relative h-5 rounded-full bg-cream-deep">
        <div
          className="bar-grow absolute inset-y-0 rounded-full bg-good"
          style={{ left: `${scale.rangeStartPct}%`, width: `${scale.rangeEndPct - scale.rangeStartPct}%` }}
        />
        <div
          className="absolute -top-2 h-9 w-1.5 -translate-x-1/2 rounded bg-ink shadow"
          style={{ left: `${scale.markerPct}%` }}
        />
        <div
          className="absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-0.5 text-sm font-extrabold text-cream"
          style={{ left: `${markerLeft}%` }}
        >
          {label} {usd(amount)}
        </div>
      </div>
      <div className="relative mt-2 h-5 text-sm font-bold text-good-ink">
        <span className="absolute -translate-x-1/2" style={{ left: `${scale.rangeStartPct}%` }}>
          {usd(range.low)}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${scale.rangeEndPct}%` }}>
          {usd(range.high)}
        </span>
      </div>
    </div>
  );
}

const LIFE_COLORS: Record<LifeTone, string> = {
  good: "bg-good",
  caution: "bg-glow",
  urgent: "bg-urgent",
};

/**
 * Age against typical life. The bar runs to 125% of typical life so an item
 * that is past its life visibly overflows the "typical life" tick.
 */
export function LifespanBar({
  ageYears,
  typicalLifeYears,
  tone,
  compact = false,
}: {
  ageYears: number;
  typicalLifeYears: number;
  tone: LifeTone;
  compact?: boolean;
}) {
  const scaleMax = typicalLifeYears * 1.25;
  const fill = Math.min(100, (ageYears / scaleMax) * 100);
  const lifeTick = (typicalLifeYears / scaleMax) * 100;
  const replaceTick = ((typicalLifeYears * 0.8) / scaleMax) * 100;

  return (
    <div
      role="img"
      aria-label={`Age ${ageYears} years against a typical life of ${typicalLifeYears} years`}
    >
      <div className={`relative rounded-full bg-cream-deep ${compact ? "h-2.5" : "h-4"}`}>
        <div className={`bar-grow h-full rounded-full ${LIFE_COLORS[tone]}`} style={{ width: `${fill}%` }} />
        <div
          className="absolute -top-1 -bottom-1 w-0.5 bg-ink/50"
          style={{ left: `${replaceTick}%` }}
          title="80% of typical life"
        />
        <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink" style={{ left: `${lifeTick}%` }} />
      </div>
      {!compact && (
        <div className="relative mt-1 h-5 text-xs font-bold text-ink-soft">
          <span className="absolute left-0">New</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${lifeTick}%` }}>
            Typical life: {typicalLifeYears} yrs
          </span>
        </div>
      )}
    </div>
  );
}
