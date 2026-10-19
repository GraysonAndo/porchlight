// Small original pictures for the step-by-step guides. Each scene is drawn in SVG, and the part a step is about is
// outlined with a pulsing ring. Every picture has a text caption next to it, so the picture is never the only way to
// get the point. Nothing here is a photo or a video, and nothing loads from the network.

import type { SceneId } from "@/lib/homeGuides";

type Box = { x: number; y: number; w: number; h: number };

const NAVY = "#0f2552";
const STEEL = "#dbe5f5";
const STEEL_DARK = "#9db0d3";
const BLUE = "#2563eb";
const RED = "#dc2626";
const ORANGE = "#f97316";
const FLOOR = "#e8eefb";

const PARTS: Record<SceneId, Record<string, Box>> = {
  heater: {
    tank: { x: 92, y: 42, w: 136, h: 154 },
    "cold-valve": { x: 168, y: 2, w: 56, h: 48 },
    relief: { x: 214, y: 76, w: 40, h: 116 },
    pan: { x: 64, y: 180, w: 192, h: 24 },
    gas: { x: 126, y: 142, w: 68, h: 44 },
  },
  toilet: {
    supply: { x: 28, y: 128, w: 92, h: 44 },
    lid: { x: 96, y: 10, w: 138, h: 28 },
    floor: { x: 20, y: 182, w: 280, h: 34 },
  },
  furnace: {
    thermostat: { x: 4, y: 52, w: 60, h: 72 },
    switch: { x: 224, y: 82, w: 34, h: 40 },
    filter: { x: 92, y: 162, w: 136, h: 30 },
  },
  panel: {
    panel: { x: 72, y: 10, w: 176, h: 200 },
    tripped: { x: 86, y: 84, w: 74, h: 22 },
  },
  dishwasher: {
    door: { x: 40, y: 140, w: 240, h: 48 },
    rack: { x: 68, y: 80, w: 184, h: 56 },
    filter: { x: 132, y: 128, w: 56, h: 44 },
  },
};

function Heater({ state }: { state?: string }) {
  const closed = state === "closed";
  return (
    <g>
      <rect x="0" y="190" width="320" height="30" fill={FLOOR} />
      <ellipse cx="160" cy="194" rx="86" ry="9" fill="#c5d0e8" stroke={STEEL_DARK} strokeWidth="2" />
      <rect x="100" y="50" width="120" height="142" rx="16" fill={STEEL} stroke={NAVY} strokeWidth="3" />
      <rect x="104" y="40" width="112" height="14" rx="6" fill={STEEL_DARK} stroke={NAVY} strokeWidth="2" />
      <rect x="150" y="20" width="20" height="22" fill="#c5d0e8" stroke={NAVY} strokeWidth="2" />
      {/* Hot pipe, with a red ring */}
      <rect x="124" y="14" width="10" height="28" fill={STEEL_DARK} stroke={NAVY} strokeWidth="2" />
      <rect x="121" y="24" width="16" height="6" rx="2" fill={RED} />
      {/* Cold pipe, with a blue ring and its shut-off valve */}
      <rect x="186" y="14" width="10" height="28" fill={STEEL_DARK} stroke={NAVY} strokeWidth="2" />
      <rect x="183" y="16" width="16" height="6" rx="2" fill={BLUE} />
      <rect x="181" y="26" width="20" height="12" rx="3" fill={NAVY} />
      {closed ? (
        <rect x="170" y="29" width="42" height="6" rx="3" fill={ORANGE} stroke={NAVY} strokeWidth="1.5" />
      ) : (
        <rect x="188.5" y="4" width="6" height="26" rx="3" fill={ORANGE} stroke={NAVY} strokeWidth="1.5" />
      )}
      {/* Relief valve with its pipe */}
      <rect x="220" y="86" width="16" height="12" rx="3" fill={NAVY} />
      <rect x="232" y="94" width="6" height="94" fill={STEEL_DARK} stroke={NAVY} strokeWidth="1.5" />
      {/* Gas control, low on the front */}
      <rect x="134" y="150" width="52" height="28" rx="6" fill="#3a4a73" stroke={NAVY} strokeWidth="2" />
      <circle cx="160" cy="164" r="8" fill="#fb923c" stroke={NAVY} strokeWidth="2" />
      <text x="160" y="124" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>
        Hearthline
      </text>
    </g>
  );
}

function Toilet({ state }: { state?: string }) {
  const closed = state === "closed";
  return (
    <g>
      <rect x="0" y="0" width="22" height="190" fill="#f1f5fc" />
      <rect x="0" y="190" width="320" height="30" fill={FLOOR} />
      <rect x="104" y="20" width="126" height="14" rx="5" fill={STEEL_DARK} stroke={NAVY} strokeWidth="2" />
      <rect x="110" y="34" width="114" height="64" rx="8" fill={STEEL} stroke={NAVY} strokeWidth="3" />
      <rect x="116" y="68" width="102" height="24" rx="4" fill="#bfdbfe" />
      <circle cx="160" cy="62" r="9" fill={ORANGE} stroke={NAVY} strokeWidth="2" />
      <rect x="156" y="70" width="2" height="20" fill={NAVY} />
      <path d="M96 100h140c0 36-18 70-70 70s-70-34-70-70z" fill={STEEL} stroke={NAVY} strokeWidth="3" />
      <rect x="130" y="166" width="72" height="20" rx="6" fill={STEEL_DARK} stroke={NAVY} strokeWidth="2" />
      {/* Supply pipe from the wall with an oval handle */}
      <rect x="22" y="146" width="70" height="8" fill={STEEL_DARK} stroke={NAVY} strokeWidth="1.5" />
      <rect x="86" y="98" width="8" height="56" fill={STEEL_DARK} stroke={NAVY} strokeWidth="1.5" />
      <rect x="48" y="138" width="22" height="24" rx="4" fill={NAVY} />
      <ellipse cx="59" cy="134" rx={closed ? 10 : 5} ry={closed ? 5 : 10} fill={ORANGE} stroke={NAVY} strokeWidth="1.5" />
      {/* Water on the floor */}
      <ellipse cx="160" cy="198" rx="90" ry="7" fill="#93c5fd" opacity="0.6" />
    </g>
  );
}

function Furnace({ state }: { state?: string }) {
  const on = state !== "off";
  return (
    <g>
      <rect x="0" y="190" width="320" height="30" fill={FLOOR} />
      <rect x="0" y="0" width="320" height="190" fill="#f6f9ff" />
      {/* Thermostat on the wall */}
      <rect x="10" y="58" width="44" height="60" rx="10" fill="#fff" stroke={NAVY} strokeWidth="3" />
      <rect x="18" y="68" width="28" height="18" rx="3" fill="#bfdbfe" />
      <text x="32" y="81" textAnchor="middle" fontSize="11" fontWeight="800" fill={NAVY}>
        68
      </text>
      <circle cx="32" cy="102" r="6" fill={ORANGE} stroke={NAVY} strokeWidth="1.5" />
      {/* Furnace cabinet */}
      <rect x="96" y="30" width="128" height="160" rx="6" fill={STEEL} stroke={NAVY} strokeWidth="3" />
      <rect x="108" y="44" width="104" height="74" rx="4" fill="#c5d0e8" stroke={STEEL_DARK} strokeWidth="2" />
      <rect x="108" y="126" width="104" height="26" rx="4" fill="#c5d0e8" stroke={STEEL_DARK} strokeWidth="2" />
      {/* Power switch on the side */}
      <rect x="228" y="86" width="26" height="32" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
      <rect x="236" y={on ? 90 : 102} width="10" height="12" rx="2" fill={on ? "#16a34a" : "#94a3b8"} stroke={NAVY} strokeWidth="1.5" />
      {/* Filter slot with a pull tab */}
      <rect x="100" y="164" width="120" height="14" rx="3" fill="#fff" stroke={NAVY} strokeWidth="2" />
      <rect x="100" y="164" width="120" height="14" rx="3" fill="url(#lines)" opacity="0.35" />
      <rect x="198" y="168" width="18" height="6" rx="2" fill={ORANGE} />
      <defs>
        <pattern id="lines" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0L6 6" stroke={NAVY} strokeWidth="0.8" />
        </pattern>
      </defs>
    </g>
  );
}

function Panel({ state }: { state?: string }) {
  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  // Handle position inside the 16 pixel slot: 0 is up (on), 4 is down (off), 2 is the tripped middle.
  const trippedOffset = state === "off" ? 4 : state === "on" ? 0 : 2;
  return (
    <g>
      <rect x="0" y="0" width="320" height="220" fill="#f6f9ff" />
      <rect x="78" y="16" width="164" height="188" rx="8" fill="#e2e8f0" stroke={NAVY} strokeWidth="3" />
      <rect x="152" y="26" width="16" height="168" fill="#94a3b8" />
      {rows.map((r) => (
        <g key={r}>
          {[0, 1].map((c) => {
            const x = c === 0 ? 90 : 176;
            const y = 28 + r * 20;
            const tripped = c === 0 && r === 3;
            return (
              <g key={c}>
                <rect x={x} y={y} width="62" height="16" rx="3" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
                <rect
                  x={x + 22}
                  y={tripped ? y + trippedOffset : y}
                  width="18"
                  height="12"
                  rx="2"
                  fill={tripped ? (state === "on" ? "#16a34a" : state === "off" ? "#94a3b8" : ORANGE) : "#16a34a"}
                  stroke={NAVY}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

function Dishwasher({ state }: { state?: string }) {
  const locked = state === "closed";
  return (
    <g>
      <rect x="0" y="0" width="320" height="220" fill="#f6f9ff" />
      <rect x="0" y="196" width="320" height="24" fill={FLOOR} />
      <rect x="56" y="24" width="208" height="150" rx="8" fill="#fff" stroke={NAVY} strokeWidth="3" />
      {/* Rack */}
      <rect x="72" y="84" width="176" height="48" rx="4" fill="none" stroke={STEEL_DARK} strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={84 + i * 21} y="84" width="2" height="48" fill={STEEL_DARK} />
      ))}
      {/* Door folded down */}
      <rect x="44" y="174" width="232" height="22" rx="6" fill={STEEL} stroke={NAVY} strokeWidth="3" />
      {/* Round filter in the tub floor */}
      <circle cx="160" cy="158" r="14" fill={locked ? STEEL : "#c5d0e8"} stroke={NAVY} strokeWidth="2.5" />
      <circle cx="160" cy="158" r="6" fill={locked ? STEEL_DARK : "#fff"} stroke={NAVY} strokeWidth="1.5" />
      <ellipse cx="190" cy="166" rx="26" ry="5" fill="#93c5fd" opacity="0.7" />
    </g>
  );
}

export function GuideScene({ scene, part, state, label }: { scene: SceneId; part: string; state?: string; label: string }) {
  const box = PARTS[scene][part];
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label={label} className="h-auto w-full rounded-2xl bg-cream">
      {scene === "heater" && <Heater state={state} />}
      {scene === "toilet" && <Toilet state={state} />}
      {scene === "furnace" && <Furnace state={state} />}
      {scene === "panel" && <Panel state={state} />}
      {scene === "dishwasher" && <Dishwasher state={state} />}
      {box && (
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx="12"
          fill="none"
          stroke={ORANGE}
          strokeWidth="4"
          strokeDasharray="8 5"
          className="glow-pulse"
        />
      )}
    </svg>
  );
}
