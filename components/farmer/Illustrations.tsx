/**
 * Simple pictures for the farm page cards, so a farmer understands a card by looking at it, without reading.
 * Each is a small inline SVG (no image files, works offline, sharp on every screen) drawn left to right in the order things happen:
 * for example sun → solar panel → pump → water. Always left-to-right, even on the Urdu page, because they show a flow.
 * Every picture has an aria-label for screen readers; the words on the card say the same.
 */

const C = {
  sky: "#e0f2fe", skyLine: "#0284c7", water: "#38bdf8", waterDeep: "#0369a1",
  sun: "#f59e0b", panel: "#1e3a8a", panelLine: "#93c5fd",
  soil: "#b45309", soilDark: "#78350f", grass: "#16a34a", leaf: "#22c55e",
  metal: "#475569", metalLight: "#94a3b8", box: "#059669", red: "#dc2626", white: "#ffffff", ink: "#0f172a",
};

function Frame({ label, children, bg = C.sky }: { label: string; children: React.ReactNode; bg?: string }) {
  return (
    <svg viewBox="0 0 320 120" className="h-auto w-full rounded-xl" role="img" aria-label={label} style={{ direction: "ltr" }}>
      <rect width="320" height="120" rx="12" fill={bg} />
      {children}
    </svg>
  );
}

/* ---- small parts used by several pictures ---- */

const Sun = ({ x, y, r = 12 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={C.sun} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={x + Math.cos(a) * (r + 3)} y1={y + Math.sin(a) * (r + 3)} x2={x + Math.cos(a) * (r + 8)} y2={y + Math.sin(a) * (r + 8)} stroke={C.sun} strokeWidth="2.5" strokeLinecap="round" />;
    })}
  </g>
);

const Panel = ({ x, y }: { x: number; y: number }) => (
  <g>
    <polygon points={`${x},${y + 30} ${x + 14},${y} ${x + 56},${y} ${x + 42},${y + 30}`} fill={C.panel} />
    <line x1={x + 7} y1={y + 15} x2={x + 49} y2={y + 15} stroke={C.panelLine} strokeWidth="1.2" />
    <line x1={x + 28} y1={y} x2={x + 21} y2={y + 30} stroke={C.panelLine} strokeWidth="1.2" />
    <line x1={x + 42} y1={y} x2={x + 35} y2={y + 30} stroke={C.panelLine} strokeWidth="1.2" />
    <rect x={x + 22} y={y + 30} width="4" height="22" fill={C.metal} />
  </g>
);

const Motor = ({ x, y }: { x: number; y: number }) => (
  <g>
    <rect x={x} y={y} width="40" height="26" rx="5" fill={C.metal} />
    <rect x={x + 6} y={y + 5} width="28" height="4" rx="2" fill={C.metalLight} />
    <rect x={x + 6} y={y + 12} width="28" height="4" rx="2" fill={C.metalLight} />
    <rect x={x + 40} y={y + 9} width="18" height="8" fill={C.metal} />
  </g>
);

const Water = ({ x, y }: { x: number; y: number }) => (
  <g>
    <path d={`M${x} ${y} q8 10 0 20 q-8 -10 0 -20z`} fill={C.water} />
    <path d={`M${x + 12} ${y + 8} q6 8 0 15 q-6 -7 0 -15z`} fill={C.water} />
    <path d={`M${x - 4} ${y + 26} h40`} stroke={C.waterDeep} strokeWidth="3" strokeLinecap="round" />
  </g>
);

const Phone = ({ x, y, children }: { x: number; y: number; children?: React.ReactNode }) => (
  <g>
    <rect x={x} y={y} width="34" height="58" rx="6" fill={C.ink} />
    <rect x={x + 3} y={y + 6} width="28" height="44" rx="3" fill={C.white} />
    <circle cx={x + 17} cy={y + 54} r="2" fill={C.metalLight} />
    {children}
  </g>
);

const Waves = ({ x, y, color = C.box }: { x: number; y: number; color?: string }) => (
  <g fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <path d={`M${x} ${y - 6} q6 6 0 12`} />
    <path d={`M${x + 7} ${y - 11} q10 11 0 22`} />
    <path d={`M${x + 14} ${y - 16} q14 16 0 32`} />
  </g>
);

const Arrow = ({ x1, x2, y }: { x1: number; x2: number; y: number }) => (
  <g stroke={C.metal} strokeWidth="2" fill={C.metal}>
    <line x1={x1} y1={y} x2={x2 - 6} y2={y} strokeDasharray="4 3" />
    <polygon points={`${x2},${y} ${x2 - 7},${y - 4} ${x2 - 7},${y + 4}`} stroke="none" />
  </g>
);

const SimBox = ({ x, y }: { x: number; y: number }) => (
  <g>
    <rect x={x} y={y} width="30" height="30" rx="4" fill={C.box} />
    <rect x={x + 8} y={y + 9} width="14" height="12" rx="2" fill={C.white} />
    <text x={x + 15} y={y + 18.5} textAnchor="middle" fontSize="7" fontWeight="700" fill={C.box} fontFamily="sans-serif">SIM</text>
    <line x1={x + 24} y1={y} x2={x + 24} y2={y - 12} stroke={C.ink} strokeWidth="2" />
    <circle cx={x + 24} cy={y - 13} r="2.2" fill={C.ink} />
  </g>
);

const Ground = ({ y = 92 }: { y?: number }) => (
  <g>
    <rect x="0" y={y} width="320" height={120 - y} fill={C.soil} />
    <rect x="0" y={y} width="320" height="5" fill={C.grass} />
  </g>
);

const Crop = ({ x, y }: { x: number; y: number }) => (
  <g stroke={C.grass} strokeWidth="2" fill={C.leaf} strokeLinecap="round">
    <line x1={x} y1={y} x2={x} y2={y - 20} />
    <path d={`M${x} ${y - 8} q-9 -3 -10 -11 q8 1 10 11z`} />
    <path d={`M${x} ${y - 13} q9 -3 10 -11 q-8 1 -10 11z`} />
  </g>
);

const Clock = ({ x, y, r = 11, color = C.ink }: { x: number; y: number; r?: number; color?: string }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={C.white} stroke={color} strokeWidth="2.5" />
    <line x1={x} y1={y} x2={x} y2={y - r + 4} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <line x1={x} y1={y} x2={x + r - 5} y2={y} stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </g>
);

/** A red "off" sign, drawn (not a font glyph, which many phones lack). */
const PowerOff = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r="11" fill={C.red} />
    <path d={`M${x} ${y - 7} v6 M${x - 5} ${y - 4} a7 7 0 1 0 10 0`} stroke={C.white} strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </g>
);

const Check = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r="9" fill={C.box} />
    <path d={`M${x - 4} ${y} l3 3 l6 -6`} stroke={C.white} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

/* ---- one picture per card ---- */

/** Pump control box: sun → solar panel → motor with the SIM box on it → signal → farmer's phone with a power button. */
export function PumpBoxArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground />
      <Sun x={28} y={26} />
      <Panel x={14} y={40} />
      <Motor x={92} y={66} />
      <SimBox x={98} y={30} />
      <line x1="113" y1="60" x2="113" y2="66" stroke={C.ink} strokeWidth="2" />
      <Water x={156} y={64} />
      <Waves x={140} y={30} />
      <Phone x={252} y={22}>
        <circle cx={269} cy={47} r="11" fill={C.box} />
        <path d="M269 40 v7 M264 43 a7 7 0 1 0 10 0" stroke={C.white} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </Phone>
      <Arrow x1={180} x2={246} y={42} />
    </Frame>
  );
}

/** Pump control: the phone's button starts the motor; the clock and the wet soil both stop it by themselves. */
export function PumpControlArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground />
      <Phone x={16} y={20}>
        <rect x={22} y={34} width="22" height="10" rx="3" fill={C.box} />
        <rect x={22} y={48} width="22" height="10" rx="3" fill={C.red} />
      </Phone>
      <Arrow x1={58} x2={104} y={52} />
      <Motor x={108} y={66} />
      <Water x={172} y={64} />
      {/* stops by itself: when the time is over (clock) ... */}
      <Clock x={236} y={34} r={14} />
      <PowerOff x={236} y={66} />
      {/* ... or when the soil is wet enough (drop) */}
      <path d="M286 18 q12 15 0 28 q-12 -13 0 -28z" fill={C.water} />
      <PowerOff x={286} y={66} />
    </Frame>
  );
}

/** Soil probe: probe in the field's soil → signal → mobile tower → farmer's phone showing a moisture drop. */
export function ProbeArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground y={70} />
      <rect x="0" y="90" width="320" height="30" fill={C.soilDark} />
      <Crop x={30} y={70} />
      <Crop x={58} y={70} />
      <g>
        <rect x={86} y={48} width="18" height="20" rx="3" fill={C.box} />
        <rect x={93} y={68} width="4" height="38" fill={C.metal} />
        <path d="M93 106 l2 6 l2 -6z" fill={C.metal} />
        <path d="M82 96 q4 -6 8 0 M100 100 q4 -6 8 0" stroke={C.water} strokeWidth="2.5" fill="none" />
      </g>
      <Waves x={110} y={52} />
      <g stroke={C.metal} strokeWidth="2.5" fill="none">
        <path d="M168 70 L178 22 L188 70" />
        <line x1="171" y1="54" x2="185" y2="54" />
        <line x1="174" y1="38" x2="182" y2="38" />
      </g>
      <Waves x={196} y={30} color={C.skyLine} />
      <Phone x={250} y={8}>
        <path d="M267 20 q9 12 0 22 q-9 -10 0 -22z" fill={C.water} />
        <rect x={257} y={46} width="20" height="4" rx="2" fill={C.box} />
      </Phone>
    </Frame>
  );
}

/** Pump timer: the farmer starts the pump himself; the phone rings when the hours are over. */
export function TimerArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground />
      <Motor x={20} y={66} />
      <Water x={84} y={64} />
      <Clock x={160} y={50} r={18} color={C.box} />
      <Phone x={238} y={22}>
        <path d="M247 38 q8 -10 16 0 l2 10 h-20z" fill={C.sun} />
        <circle cx={255} cy={51} r="2.5" fill={C.sun} />
      </Phone>
      <g stroke={C.red} strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M282 32 q6 6 0 12" />
        <path d="M288 27 q10 11 0 22" />
        <path d="M232 32 q-6 6 0 12" />
      </g>
    </Frame>
  );
}

/** Live water meter: sun → panel → solar drive → litres counting up. */
export function LiveMeterArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground />
      <Sun x={26} y={24} />
      <Panel x={12} y={40} />
      <Arrow x1={72} x2={100} y={70} />
      <g>
        <rect x={104} y={46} width="40" height="46" rx="4" fill={C.metal} />
        <rect x={110} y={52} width="28" height="14" rx="2" fill="#bbf7d0" />
        <text x={124} y={62.5} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.ink} fontFamily="monospace">kW</text>
      </g>
      <Arrow x1={150} x2={182} y={70} />
      <g>
        <circle cx={226} cy={58} r="30" fill={C.white} stroke={C.waterDeep} strokeWidth="4" />
        <path d="M226 58 L244 42" stroke={C.red} strokeWidth="3" strokeLinecap="round" />
        <circle cx={226} cy={58} r="3.5" fill={C.ink} />
        <path d="M209 74 q6 -8 0 -16 q-6 8 0 16z" fill={C.water} />
      </g>
      <Water x={276} y={62} />
    </Frame>
  );
}

/** Bucket test: water from the pump pipe fills a bucket; a stopwatch counts the seconds. */
export function BucketArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground y={100} />
      <Sun x={30} y={24} />
      <rect x={60} y={36} width="90" height="12" rx="3" fill={C.metal} />
      <rect x={146} y={36} width="12" height="22" rx="2" fill={C.metal} />
      <path d="M152 58 v24" stroke={C.water} strokeWidth="7" strokeLinecap="round" />
      <path d="M128 70 h48 l-6 30 h-36z" fill={C.box} />
      <path d="M131 78 h42" stroke={C.water} strokeWidth="5" />
      <Clock x={232} y={56} r={22} />
      <rect x={228} y={28} width="8" height="6" rx="2" fill={C.ink} />
      <text x={270} y={62} fontSize="16" fontWeight="800" fill={C.ink} fontFamily="sans-serif">s</text>
    </Frame>
  );
}

/** Fertiliser: a bag with the amount → the crop; a rain cloud means wait. */
export function FertiliserArt({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <Ground />
      <g>
        <path d="M24 44 h50 l4 48 h-58z" fill="#fef3c7" stroke={C.soilDark} strokeWidth="2.5" />
        <text x={49} y={74} textAnchor="middle" fontSize="13" fontWeight="800" fill={C.soilDark} fontFamily="sans-serif">N</text>
      </g>
      <Arrow x1={88} x2={124} y={70} />
      <Crop x={140} y={92} />
      <Crop x={164} y={92} />
      <Crop x={188} y={92} />
      <g>
        <path d="M232 46 a14 14 0 0 1 26 -8 a12 12 0 0 1 22 8 a10 10 0 0 1 -2 20 h-44 a10 10 0 0 1 -2 -20z" fill={C.metalLight} />
        <path d="M244 72 l-3 9 M258 72 l-3 9 M272 72 l-3 9" stroke={C.water} strokeWidth="3" strokeLinecap="round" />
        <Clock x={292} y={30} r={9} />
      </g>
    </Frame>
  );
}

/** Farm location: the farmer stands in his field with the phone; a pin marks the spot. */
export function LocationArt({ label }: { label: string }) {
  return (
    <Frame label={label} bg="#fef3c7">
      <rect x="0" y="70" width="320" height="50" fill={C.grass} opacity="0.85" />
      {[30, 62, 94, 226, 258, 290].map((x) => <Crop key={x} x={x} y={104} />)}
      <g>
        <path d="M160 14 a22 22 0 0 1 22 22 c0 16 -22 38 -22 38 s-22 -22 -22 -38 a22 22 0 0 1 22 -22z" fill={C.red} />
        <circle cx={160} cy={36} r="8" fill={C.white} />
      </g>
      <Phone x={196} y={30}>
        <path d="M213 42 a7 7 0 0 1 7 7 c0 5 -7 12 -7 12 s-7 -7 -7 -12 a7 7 0 0 1 7 -7z" fill={C.red} />
      </Phone>
      <Check x={242} y={34} />
    </Frame>
  );
}
