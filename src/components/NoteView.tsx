// Szabad szöveges jegyzet a vásznon. Mozgatható (data-note), kijelölhető;
// a szöveget az Inspectorban lehet szerkeszteni. Több sor is támogatott.

import type { Note } from "../types";

interface Props {
  note: Note;
  selected: boolean;
  onSelect: (id: string) => void;
}

const LINE = 16;
const PAD = 8;
const CHAR = 6.6;

export function NoteView({ note, selected, onSelect }: Props) {
  const lines = (note.text || " ").split("\n");
  const maxLen = Math.max(1, ...lines.map((l) => l.length));
  const w = Math.min(360, Math.max(60, maxLen * CHAR + PAD * 2));
  const h = lines.length * LINE + PAD * 2;
  const color = note.color ?? "#92400e";

  return (
    <g
      data-note={note.id}
      transform={`translate(${note.x} ${note.y})`}
      className={selected ? "note selected" : "note"}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(note.id);
      }}
    >
      <rect className="note-bg" width={w} height={h} rx={6} />
      <text className="note-text" x={PAD} y={PAD + 12} style={{ fill: color }}>
        {lines.map((l, i) => (
          <tspan key={i} x={PAD} dy={i === 0 ? 0 : LINE}>
            {l || " "}
          </tspan>
        ))}
      </text>
    </g>
  );
}
