// Fő elrendezés + globális billentyűparancsok.

import { useEffect, useRef, useState } from "react";
import { useEditor } from "./state/useEditor";
import { Toolbar } from "./components/Toolbar";
import { Palette } from "./components/Palette";
import { Canvas, type CanvasHandle } from "./components/Canvas";
import { Inspector } from "./components/Inspector";
import { NetlistPanel } from "./components/NetlistPanel";

export default function App() {
  const editor = useEditor();
  const canvasRef = useRef<CanvasHandle | null>(null);
  const [netlistOpen, setNetlistOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      const mod = e.metaKey || e.ctrlKey;

      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        e.preventDefault();
        editor.deleteSelection();
      } else if (e.key === "Escape") {
        editor.cancelPending();
        editor.setSelection(null);
      } else if (mod && e.key.toLowerCase() === "z") {
        // Shift+Z = újra, egyébként vissza.
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        editor.redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        // Kijelölt komponens duplikálása.
        if (editor.selection?.kind === "instance") {
          e.preventDefault();
          editor.duplicateInstance(editor.selection.id);
        }
      } else if (!typing && e.key.toLowerCase() === "f") {
        // Ráközelítés a kijelölt komponensre.
        if (editor.selection?.kind === "instance") {
          e.preventDefault();
          canvasRef.current?.fitSelection();
        }
      } else if (!typing && e.key.toLowerCase() === "m") {
        // Tükrözés.
        if (editor.selection?.kind === "instance") {
          e.preventDefault();
          editor.toggleMirror(editor.selection.id);
        }
      } else if (!typing && e.key.startsWith("Arrow")) {
        // Nyíl-tologatás (Shift = nagyobb lépés).
        if (editor.selection && editor.selection.kind !== "wire") {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          editor.nudgeSelection(dx, dy);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  return (
    <div className="app">
      <Toolbar
        editor={editor}
        onFit={() => canvasRef.current?.fit()}
        onAddNote={() => canvasRef.current?.addNoteAtCenter()}
        onToggleNetlist={() => setNetlistOpen((v) => !v)}
        netlistOpen={netlistOpen}
      />
      <div className="workspace">
        <Palette onAdd={(defId) => canvasRef.current?.addAtCenter(defId)} />
        <Canvas ref={canvasRef} editor={editor} />
        <Inspector editor={editor} />
      </div>
      {netlistOpen && (
        <NetlistPanel editor={editor} onClose={() => setNetlistOpen(false)} />
      )}
      {editor.hint && <div className="hint-bar">{editor.hint}</div>}
    </div>
  );
}
