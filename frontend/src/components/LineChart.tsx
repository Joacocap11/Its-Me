import { useState, type PointerEvent } from "react";
import { formatDate, formatNumber } from "../lib/format";

export interface ChartPoint {
  date: string;
  value: number;
}

const W = 480;
const H = 240;
const PAD = { l: 48, r: 16, t: 16, b: 32 };

export function LineChart({ points, unit }: { points: ChartPoint[]; unit: string | null }) {
  const [active, setActive] = useState<number | null>(null);
  const data = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const times = data.map((p) => Date.parse(p.date));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const values = data.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const margin = (hi - lo) * 0.1;
  lo -= margin;
  hi += margin;

  const x = (t: number) => PAD.l + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const coords = data.map((p, i) => [x(times[i]!), y(p.value)] as const);
  const ticks = [lo, (lo + hi) / 2, hi];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    coords.forEach(([cx], i) => {
      if (Math.abs(cx - px) < Math.abs(coords[best]![0] - px)) best = i;
    });
    setActive(best);
  };

  const shown = active !== null ? data[active] : data[data.length - 1];
  const unitSuffix = unit ? ` ${unit}` : "";

  return (
    <figure>
      <figcaption className="mb-2 text-sm text-slate-600 dark:text-slate-300">
        {shown && (
          <>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(shown.value)}
              {unitSuffix}
            </span>{" "}
            · {formatDate(shown.date)}
          </>
        )}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y"
        role="img"
        aria-label={`Evolución: ${data.length} registros entre ${formatDate(data[0]!.date)} y ${formatDate(data[data.length - 1]!.date)}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-800" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-slate-500 text-xs">
              {formatNumber(Math.round(v * 10) / 10)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 8} className="fill-slate-500 text-xs">
          {formatDate(data[0]!.date)}
        </text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-slate-500 text-xs">
          {formatDate(data[data.length - 1]!.date)}
        </text>
        <polyline
          points={coords.map((c) => c.join(",")).join(" ")}
          fill="none"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-indigo-500"
        />
        {coords.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={i === active ? 6 : 3.5}
            className="fill-white stroke-indigo-500 dark:fill-slate-900"
            strokeWidth="2.5"
          />
        ))}
      </svg>
    </figure>
  );
}
