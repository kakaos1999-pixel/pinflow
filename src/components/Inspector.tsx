// Jobb oldali vizsgáló: a kijelölt példány vagy vezeték adatai és szerkesztése.

import type { useEditor } from "../state/useEditor";
import { getDef } from "../data/components";
import { busColor, resolvePin } from "../lib/geometry";

type Editor = ReturnType<typeof useEditor>;

const WIRE_COLORS = [
  "#e5484d",
  "#687076",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#06b6d4",
  "#0f172a",
];

export function Inspector({ editor }: { editor: Editor }) {
  const { selection, project } = editor;

  if (!selection) {
    return (
      <aside className="inspector">
        <div className="inspector-head">Tulajdonságok</div>
        <p className="inspector-empty">
          Jelölj ki egy komponenst vagy vezetéket a szerkesztéshez.
        </p>
        <Legend />
      </aside>
    );
  }

  if (selection.kind === "instance") {
    const inst = project.instances.find((i) => i.id === selection.id);
    const def = inst ? getDef(inst.defId) : undefined;
    if (!inst || !def) return null;
    return (
      <aside className="inspector">
        <div className="inspector-head">Komponens</div>
        <div className="field">
          <label>Típus</label>
          <div className="field-static">{def.name}</div>
        </div>
        <div className="field">
          <label>Címke</label>
          <input
            type="text"
            value={inst.label ?? ""}
            placeholder={def.name}
            onChange={(e) => editor.setInstanceLabel(inst.id, e.target.value)}
          />
        </div>
        {def.note && <p className="inspector-note">{def.note}</p>}
        <div className="field-static small">
          Pozíció: {inst.x}, {inst.y} · {def.pins.length} láb
        </div>
        <button className="danger" onClick={() => editor.deleteInstance(inst.id)}>
          Komponens törlése
        </button>
        <Legend />
      </aside>
    );
  }

  // Vezeték.
  const wire = project.wires.find((w) => w.id === selection.id);
  if (!wire) return null;
  const a = resolvePin(project, wire.from);
  const b = resolvePin(project, wire.to);
  const color = wire.color ?? busColor(a?.pin.bus);

  return (
    <aside className="inspector">
      <div className="inspector-head">Vezeték</div>
      <div className="field-static">
        {a ? `${a.instance.label || a.def.name} · ${a.pin.name}` : "?"}
        {"  →  "}
        {b ? `${b.instance.label || b.def.name} · ${b.pin.name}` : "?"}
      </div>
      <div className="field">
        <label>Szín</label>
        <div className="swatches">
          {WIRE_COLORS.map((c) => (
            <button
              key={c}
              className={color === c ? "swatch active" : "swatch"}
              style={{ background: c }}
              onClick={() => editor.setWireColor(wire.id, c)}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => editor.setWireColor(wire.id, e.target.value)}
            title="Egyéni szín"
          />
        </div>
      </div>
      <button className="danger" onClick={() => editor.deleteWire(wire.id)}>
        Vezeték törlése
      </button>
      <Legend />
    </aside>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["power", "táp"],
    ["gnd", "föld"],
    ["gpio", "GPIO"],
    ["i2c", "I2C"],
    ["spi", "SPI"],
    ["uart", "UART"],
    ["i2s", "I2S"],
    ["pwm", "PWM"],
    ["analog", "analóg"],
  ];
  return (
    <div className="legend">
      <div className="legend-head">Busz-színek</div>
      {items.map(([bus, label]) => (
        <div key={bus} className="legend-row">
          <span
            className="legend-dot"
            style={{ background: busColor(bus as never) }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}
