// Egy vezeték rajza két láb között. Vastag, átlátszó "hit" path segíti a kijelölést.

import type { Project, Wire } from "../types";
import { busColor, pinWorldPos, resolvePin, wirePath } from "../lib/geometry";

interface Props {
  wire: Wire;
  project: Project;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function WireView({ wire, project, selected, onSelect }: Props) {
  const a = resolvePin(project, wire.from);
  const b = resolvePin(project, wire.to);
  if (!a || !b) return null;

  const pa = pinWorldPos(a.instance, a.def, a.pin.id)!;
  const pb = pinWorldPos(b.instance, b.def, b.pin.id)!;
  const d = wirePath(pa, pb, a.pin.side, b.pin.side);
  const color = wire.color ?? busColor(a.pin.bus);

  return (
    <g
      data-wire={wire.id}
      className={selected ? "wire selected" : "wire"}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(wire.id);
      }}
    >
      <path className="wire-hit" d={d} />
      {selected && <path className="wire-halo" d={d} />}
      <path className="wire-line" d={d} style={{ stroke: color }} />
      {/* Végpont-korongok, hogy a kapcsolat egyértelmű legyen. */}
      <circle cx={pa.x} cy={pa.y} r={3.5} style={{ fill: color }} />
      <circle cx={pb.x} cy={pb.y} r={3.5} style={{ fill: color }} />
    </g>
  );
}
