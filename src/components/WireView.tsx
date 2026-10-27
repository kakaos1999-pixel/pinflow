// Egy vezeték rajza két láb között. Vastag, átlátszó "hit" path segíti a kijelölést.

import type { Project, Wire } from "../types";
import {
  busColor,
  midPoint,
  pinWorldPos,
  type Rect,
  resolvePin,
  routeWire,
} from "../lib/geometry";

interface Props {
  wire: Wire;
  project: Project;
  selected: boolean;
  /** A vezeték a kijelölt komponenshez csatlakozik — kiemeljük. */
  connected: boolean;
  /** Derékszögű útvonal. */
  ortho: boolean;
  /** Komponens-akadályok, hogy a vezeték kikerülje az eszközöket. */
  obstacles: Rect[];
  onSelect: (id: string) => void;
}

export function WireView({
  wire,
  project,
  selected,
  connected,
  ortho,
  obstacles,
  onSelect,
}: Props) {
  const a = resolvePin(project, wire.from);
  const b = resolvePin(project, wire.to);
  if (!a || !b) return null;

  const pa = pinWorldPos(a.instance, a.def, a.pin.id)!;
  const pb = pinWorldPos(b.instance, b.def, b.pin.id)!;
  const d = routeWire(pa, pb, a.pin.side, b.pin.side, ortho, obstacles);
  const color = wire.color ?? busColor(a.pin.bus);
  const mid = midPoint(pa, pb);

  const cls = ["wire"];
  if (selected) cls.push("selected");
  if (connected) cls.push("connected");

  return (
    <g
      data-wire={wire.id}
      className={cls.join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(wire.id);
      }}
    >
      <path className="wire-hit" d={d} />
      {(selected || connected) && <path className="wire-halo" d={d} />}
      <path className="wire-line" d={d} style={{ stroke: color }} />
      {/* Végpont-korongok, hogy a kapcsolat egyértelmű legyen. */}
      <circle cx={pa.x} cy={pa.y} r={3.5} style={{ fill: color }} />
      <circle cx={pb.x} cy={pb.y} r={3.5} style={{ fill: color }} />
      {wire.label && (
        <g className="wire-label" transform={`translate(${mid.x} ${mid.y})`}>
          <rect
            className="wire-label-bg"
            x={-wire.label.length * 3.2 - 5}
            y={-9}
            width={wire.label.length * 6.4 + 10}
            height={16}
            rx={5}
          />
          <text className="wire-label-text" textAnchor="middle" y={2.5}>
            {wire.label}
          </text>
        </g>
      )}
    </g>
  );
}
