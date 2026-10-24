// Komponens-paletta: innen lehet drag-and-drop behúzni (vagy kattintással
// hozzáadni) komponenseket a vászonra.

import { COMPONENTS } from "../data/components";

interface Props {
  onAdd: (defId: string) => void;
}

export function Palette({ onAdd }: Props) {
  return (
    <aside className="palette">
      <div className="palette-head">Komponensek</div>
      <div className="palette-list">
        {COMPONENTS.map((def) => (
          <button
            key={def.id}
            className="palette-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/pinflow", def.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onAdd(def.id)}
            title={def.note}
          >
            <span
              className="palette-swatch"
              style={{ background: def.color ?? "#334155" }}
            />
            <span className="palette-text">
              <span className="palette-name">{def.name}</span>
              <span className="palette-meta">
                {def.category} · {def.pins.length} láb
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="palette-foot">
        Húzd a vászonra, vagy kattints rá. A lábakra kattintva (egyik → másik)
        húzol vezetéket.
      </div>
    </aside>
  );
}
