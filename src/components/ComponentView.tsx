// Egy lehelyezett komponens-példány rajza: doboz + címke-sáv + lábak.

import type { ComponentDef, Instance, PinRef } from "../types";
import { busColor, placedPins } from "../lib/geometry";

interface Props {
  instance: Instance;
  def: ComponentDef;
  selected: boolean;
  pending: PinRef | null;
  onPinClick: (ref: PinRef) => void;
}

export function ComponentView({
  instance,
  def,
  selected,
  pending,
  onPinClick,
}: Props) {
  const pins = placedPins(def, instance);
  return (
    <g
      data-instance={instance.id}
      transform={`translate(${instance.x} ${instance.y})`}
      className={selected ? "component selected" : "component"}
    >
      <rect
        className="component-body"
        width={def.width}
        height={def.height}
        rx={10}
      />
      {/* Fejléc-sáv a komponens színével. */}
      <path
        className="component-header"
        d={headerPath(def.width)}
        fill={def.color ?? "#334155"}
      />
      <text className="component-title" x={def.width / 2} y={18}>
        {instance.label || def.name}
      </text>

      {pins.map((pin) => {
        const isPending =
          pending &&
          pending.instanceId === instance.id &&
          pending.pinId === pin.id;
        const left = pin.side === "left";
        const lx = left ? pin.x + 10 : pin.x - 10;
        const tip = [pin.name, pin.sub].filter(Boolean).join(" · ");
        return (
          <g
            key={pin.id}
            data-pin={pin.id}
            className={isPending ? "pin pin-pending" : "pin"}
            onClick={(e) => {
              e.stopPropagation();
              onPinClick({ instanceId: instance.id, pinId: pin.id });
            }}
          >
            {/* Natív SVG tooltip: láb teljes neve + alfunkció. */}
            <title>{tip}</title>
            {/* Nagyobb, átlátszó kattintási felület. */}
            <circle cx={pin.x} cy={pin.y} r={10} className="pin-hit" />
            <circle
              cx={pin.x}
              cy={pin.y}
              r={5}
              className="pin-dot"
              style={{ fill: busColor(pin.bus) }}
            />
            <text
              className="pin-name"
              x={lx}
              y={pin.y - 1}
              textAnchor={left ? "start" : "end"}
            >
              {pin.name}
            </text>
            {pin.sub && (
              <text
                className="pin-sub"
                x={lx}
                y={pin.y + 8.5}
                textAnchor={left ? "start" : "end"}
              >
                {pin.sub}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Lekerekített felső sáv (csak a felső sarkok kerekek). */
function headerPath(w: number): string {
  const r = 10;
  const h = 26;
  return `M 0 ${h} L 0 ${r} Q 0 0 ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h} Z`;
}
