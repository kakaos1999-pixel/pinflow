// Felső eszköztár: projektnév, mentés/betöltés, export, undo, illesztés.

import { useRef } from "react";
import type { useEditor } from "../state/useEditor";
import { exportJson, importJson } from "../lib/storage";
import { exportPdf, exportPng, exportSvg } from "../lib/export";

type Editor = ReturnType<typeof useEditor>;

interface Props {
  editor: Editor;
  onFit: () => void;
  onAddNote: () => void;
  onToggleNetlist: () => void;
  netlistOpen: boolean;
}

export function Toolbar({
  editor,
  onFit,
  onAddNote,
  onToggleNetlist,
  netlistOpen,
}: Props) {
  const { project, settings } = editor;
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await importJson(file);
      editor.loadProject(loaded);
      requestAnimationFrame(onFit);
    } catch {
      alert("Nem sikerült beolvasni a fájlt (érvénytelen JSON).");
    }
    e.target.value = "";
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-dot" />
        PinFlow
      </div>

      <input
        className="project-name"
        type="text"
        value={project.name}
        onChange={(e) => editor.renameProject(e.target.value)}
        title="Projekt neve"
      />

      <div className="toolbar-group">
        <button onClick={editor.newProject}>Új</button>
        <button onClick={() => exportJson(project)}>Mentés (JSON)</button>
        <button onClick={() => fileRef.current?.click()}>Betöltés</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={onPickFile}
        />
      </div>

      <div className="toolbar-group">
        <button onClick={() => exportSvg(project)}>SVG</button>
        <button
          onClick={() =>
            exportPng(project).catch(() => alert("PNG export sikertelen."))
          }
        >
          PNG
        </button>
        <button
          onClick={() =>
            exportPdf(project).catch(() => alert("PDF export sikertelen."))
          }
        >
          PDF
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={editor.undo} title="Visszavonás (Ctrl/Cmd+Z)">
          ↶
        </button>
        <button onClick={editor.redo} title="Újra (Ctrl/Cmd+Shift+Z)">
          ↷
        </button>
        <button onClick={onFit} title="Illesztés a tartalomhoz">
          ⤢ Illeszt
        </button>
        <button onClick={onAddNote} title="Szöveges jegyzet hozzáadása">
          + Jegyzet
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className={settings.snap ? "toggle on" : "toggle"}
          onClick={() => editor.setSetting("snap", !settings.snap)}
          title="Rácshoz illesztés mozgatáskor"
        >
          ⌗ Rács
        </button>
        <button
          className={netlistOpen ? "toggle on" : "toggle"}
          onClick={onToggleNetlist}
          title="Netlista / alkatrészlista / ellenőrzés"
        >
          ☰ Netlista
        </button>
        <button onClick={editor.toggleTheme} title="Világos / sötét téma">
          {settings.theme === "dark" ? "☀︎" : "☾"}
        </button>
      </div>

      <div className="toolbar-spacer" />
      <div className="toolbar-stats">
        {project.instances.length} komponens · {project.wires.length} vezeték
      </div>
    </header>
  );
}
