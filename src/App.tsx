// Fő elrendezés + globális billentyűparancsok.

import { useEffect, useRef } from "react";
import { useEditor } from "./state/useEditor";
import { Toolbar } from "./components/Toolbar";
import { Palette } from "./components/Palette";
import { Canvas, type CanvasHandle } from "./components/Canvas";
import { Inspector } from "./components/Inspector";

export default function App() {
  const editor = useEditor();
  const canvasRef = useRef<CanvasHandle | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        e.preventDefault();
        editor.deleteSelection();
      } else if (e.key === "Escape") {
        editor.cancelPending();
        editor.setSelection(null);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        editor.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  return (
    <div className="app">
      <Toolbar editor={editor} onFit={() => canvasRef.current?.fit()} />
      <div className="workspace">
        <Palette onAdd={(defId) => canvasRef.current?.addAtCenter(defId)} />
        <Canvas ref={canvasRef} editor={editor} />
        <Inspector editor={editor} />
      </div>
      {editor.hint && <div className="hint-bar">{editor.hint}</div>}
    </div>
  );
}
