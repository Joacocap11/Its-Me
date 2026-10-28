import type { KeyboardEvent } from "react";
import type { Region } from "../api/types";
import { BODY_SHAPES, BODY_VIEWBOX, BODY_WIDTH, REGION_DOTS, type BodyView } from "../lib/body";
import { regionLabel } from "../lib/regions";

interface Props {
  view: BodyView;
  selected: Region | null;
  withData: Set<Region>;
  onSelect: (region: Region) => void;
}

const mirrorTransform = `translate(${BODY_WIDTH},0) scale(-1,1)`;

export function Silhouette({ view, selected, withData, onSelect }: Props) {
  const onKey = (e: KeyboardEvent, region: Region) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(region);
    }
  };

  const shapes = BODY_SHAPES[view];
  const dots = shapes.flatMap((s) => (s.region && withData.has(s.region) ? [s.region] : []));

  return (
    <svg
      viewBox={BODY_VIEWBOX}
      className="mx-auto h-auto max-h-[68vh] w-full max-w-[18rem] select-none"
      role="group"
      aria-label={view === "front" ? "Cuerpo, vista frontal" : "Cuerpo, vista posterior"}
    >
      {shapes.map((s, i) =>
        s.region === null ? (
          <g key={i}>
            <path className="body-static" d={s.d} />
          </g>
        ) : (
          <g
            key={s.region}
            className="region"
            role="button"
            tabIndex={0}
            aria-label={regionLabel(s.region)}
            aria-pressed={selected === s.region}
            onClick={() => onSelect(s.region!)}
            onKeyDown={(e) => onKey(e, s.region!)}
          >
            <title>{regionLabel(s.region)}</title>
            <path d={s.d} />
            {s.mirror && <path d={s.d} transform={mirrorTransform} />}
          </g>
        ),
      )}
      {dots.map((region) => {
        const dot = REGION_DOTS[region];
        if (!dot) return null;
        const [x, y] = dot.at;
        return (
          <g key={region}>
            <circle className="region-dot" cx={x} cy={y} r="3.5" />
            {dot.mirror && <circle className="region-dot" cx={BODY_WIDTH - x} cy={y} r="3.5" />}
          </g>
        );
      })}
    </svg>
  );
}
