// A rajzvászon: SVG munkafelület pan/zoom-mal, komponens-mozgatással,
// paletta-ledobással és a folyamatban lévő vezeték előnézetével.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getDef } from "../data/components";
import { obstacleRects, pinWorldPos, resolvePin, routeWire } from "../lib/geometry";
import { ComponentView } from "./ComponentView";
import { WireView } from "./WireView";
import { NoteView } from "./NoteView";
import type { useEditor } from "../state/useEditor";

export interface CanvasHandle {
  addAtCenter: (defId: string) => void;
  addNoteAtCenter: () => void;
  fit: () => void;
  fitSelection: () => void;
}

type Editor = ReturnType<typeof useEditor>;

interface Props {
  editor: Editor;
}

const GRID = 20;
const DRAG_THRESHOLD = 4;

type Drag =
  | { mode: "pan"; sx: number; sy: number; ox: number; oy: number }
  | { mode: "move"; id: string; swx: number; swy: number; ox: number; oy: number }
  | { mode: "note"; id: string; swx: number; swy: number; ox: number; oy: number }
  | null;

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { editor },
  ref,
) {
  const { project, view, selection, pending } = editor;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<Drag>(null);
  const movedRef = useRef(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);

  // Képernyő → világ koordináta.
  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.tx) / view.scale,
      y: (clientY - rect.top - view.ty) / view.scale,
    };
  };

  useImperativeHandle(ref, () => ({
    addAtCenter: (defId: string) => {
      const def = getDef(defId);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (rect.width / 2 - view.tx) / view.scale;
      const cy = (rect.height / 2 - view.ty) / view.scale;
      editor.addInstance(
        defId,
        cx - (def?.width ?? 80) / 2,
        cy - (def?.height ?? 60) / 2,
      );
    },
    addNoteAtCenter: () => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (rect.width / 2 - view.tx) / view.scale;
      const cy = (rect.height / 2 - view.ty) / view.scale;
      editor.addNote(cx - 40, cy - 14);
    },
    fit: () => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) editor.fitView(rect.width, rect.height);
    },
    fitSelection: () => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) editor.fitSelection(rect.width, rect.height);
    },
  }));

  // Nem-passzív wheel: cursor-középpontú zoom.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newScale = clamp(view.scale * factor, 0.2, 4);
      const k = newScale / view.scale;
      editor.setView({
        scale: newScale,
        tx: mx - (mx - view.tx) * k,
        ty: my - (my - view.ty) * k,
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [view, editor]);

  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as Element;
    if (t.closest("[data-pin]")) return; // lábat a saját onClick kezel
    const wireEl = t.closest("[data-wire]");
    if (wireEl) return; // vezetéket a saját onClick kezel
    movedRef.current = false;
    svgRef.current?.setPointerCapture(e.pointerId);

    const noteEl = t.closest("[data-note]") as Element | null;
    if (noteEl) {
      const id = noteEl.getAttribute("data-note")!;
      const note = project.notes.find((n) => n.id === id);
      if (!note) return;
      editor.snapshot();
      editor.setSelection({ kind: "note", id });
      const w = toWorld(e.clientX, e.clientY);
      dragRef.current = {
        mode: "note",
        id,
        swx: w.x,
        swy: w.y,
        ox: note.x,
        oy: note.y,
      };
      return;
    }

    const instEl = t.closest("[data-instance]") as Element | null;
    if (instEl) {
      const id = instEl.getAttribute("data-instance")!;
      const inst = project.instances.find((i) => i.id === id);
      if (!inst) return;
      editor.snapshot(); // undo-pont a mozgatás előtt
      editor.setSelection({ kind: "instance", id });
      const w = toWorld(e.clientX, e.clientY);
      dragRef.current = {
        mode: "move",
        id,
        swx: w.x,
        swy: w.y,
        ox: inst.x,
        oy: inst.y,
      };
    } else {
      dragRef.current = {
        mode: "pan",
        sx: e.clientX,
        sy: e.clientY,
        ox: view.tx,
        oy: view.ty,
      };
      setPanning(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // Vezeték-előnézet mindig követi a kurzort, ha van függő láb.
    if (pending) setCursor(toWorld(e.clientX, e.clientY));

    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "pan") {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) movedRef.current = true;
      editor.setView({ ...view, tx: d.ox + dx, ty: d.oy + dy });
    } else {
      const w = toWorld(e.clientX, e.clientY);
      const dx = w.x - d.swx;
      const dy = w.y - d.swy;
      if (Math.hypot(dx, dy) * view.scale > DRAG_THRESHOLD)
        movedRef.current = true;
      if (d.mode === "note") editor.moveNote(d.id, d.ox + dx, d.oy + dy);
      else editor.moveInstance(d.id, d.ox + dx, d.oy + dy);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    svgRef.current?.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setPanning(false);
    // Üres háttérre kattintás (nem húzás) → kijelölés + függő vezeték törlése.
    if (d?.mode === "pan" && !movedRef.current) {
      editor.setSelection(null);
      editor.cancelPending();
    }
  };

  // Paletta-ledobás.
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("text/pinflow")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (e: React.DragEvent) => {
    const defId = e.dataTransfer.getData("text/pinflow");
    if (!defId) return;
    e.preventDefault();
    const def = getDef(defId);
    const w = toWorld(e.clientX, e.clientY);
    editor.addInstance(defId, w.x - (def?.width ?? 80) / 2, w.y - 14);
  };

  const ortho = editor.settings.ortho;
  const obstacles = obstacleRects(project);

  // Függő vezeték előnézet-útvonala.
  let preview: string | null = null;
  if (pending && cursor) {
    const src = resolvePin(project, pending);
    if (src) {
      const p = pinWorldPos(src.instance, src.def, src.pin.id)!;
      preview = routeWire(p, cursor, src.pin.side, undefined, ortho, obstacles);
    }
  }

  // A kijelölt komponenshez csatlakozó vezetékek (kiemeléshez).
  const selInstId =
    selection?.kind === "instance" ? selection.id : null;
  const connectedWires = new Set<string>();
  if (selInstId) {
    for (const w of project.wires) {
      if (w.from.instanceId === selInstId || w.to.instanceId === selInstId)
        connectedWires.add(w.id);
    }
  }

  const gridOffX = ((view.tx % (GRID * view.scale)) + GRID * view.scale) %
    (GRID * view.scale);
  const gridOffY = ((view.ty % (GRID * view.scale)) + GRID * view.scale) %
    (GRID * view.scale);

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        className={panning ? "canvas panning" : "canvas"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <defs>
          <pattern
            id="grid"
            width={GRID * view.scale}
            height={GRID * view.scale}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${gridOffX} ${gridOffY})`}
          >
            <circle
              className="grid-dot"
              cx={0.5}
              cy={0.5}
              r={1}
              opacity={Math.min(1, view.scale)}
            />
          </pattern>
        </defs>
        <rect className="canvas-bg" width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {project.wires.map((w) => (
            <WireView
              key={w.id}
              wire={w}
              project={project}
              selected={selection?.kind === "wire" && selection.id === w.id}
              connected={connectedWires.has(w.id)}
              ortho={ortho}
              obstacles={obstacles}
              onSelect={(id) => editor.setSelection({ kind: "wire", id })}
            />
          ))}

          {preview && <path className="wire-preview" d={preview} />}

          {project.notes.map((n) => (
            <NoteView
              key={n.id}
              note={n}
              selected={selection?.kind === "note" && selection.id === n.id}
              onSelect={(id) => editor.setSelection({ kind: "note", id })}
            />
          ))}

          {project.instances.map((inst) => {
            const def = getDef(inst.defId);
            if (!def) return null;
            return (
              <ComponentView
                key={inst.id}
                instance={inst}
                def={def}
                selected={
                  selection?.kind === "instance" && selection.id === inst.id
                }
                pending={pending}
                onPinClick={editor.clickPin}
              />
            );
          })}
        </g>
      </svg>

      {project.instances.length === 0 && (
        <div className="canvas-empty">
          Húzz ide komponenst a bal oldali palettáról, vagy kattints rá a
          hozzáadáshoz.
        </div>
      )}

      <div className="view-controls">
        <button
          title="Kicsinyítés"
          onClick={() =>
            editor.setView({ ...view, scale: clamp(view.scale / 1.2, 0.2, 4) })
          }
        >
          −
        </button>
        <button
          title="100%"
          onClick={() => editor.setView({ ...view, scale: 1 })}
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button
          title="Nagyítás"
          onClick={() =>
            editor.setView({ ...view, scale: clamp(view.scale * 1.2, 0.2, 4) })
          }
        >
          +
        </button>
        <button
          title="Illesztés a tartalomhoz"
          onClick={() => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) editor.fitView(rect.width, rect.height);
          }}
        >
          ⤢
        </button>
        {selection?.kind === "instance" && (
          <button
            title="Ráközelítés a kijelöltre (F)"
            onClick={() => {
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) editor.fitSelection(rect.width, rect.height);
            }}
          >
            ⊙
          </button>
        )}
      </div>
    </div>
  );
});

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
