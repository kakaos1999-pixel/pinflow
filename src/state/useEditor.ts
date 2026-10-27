// A szerkesztő központi állapota: projekt (undo-val), nézet (pan/zoom),
// kijelölés és a folyamatban lévő vezeték (első kattintott láb).

import { useCallback, useEffect, useRef, useState } from "react";
import type { PinRef, Project, Wire } from "../types";
import { emptyProject } from "../types";
import { getDef } from "../data/components";
import { uid } from "../lib/uid";
import { contentBounds, instanceBounds } from "../lib/geometry";
import {
  loadLocal,
  loadSettings,
  saveLocal,
  saveSettings,
  type Settings,
} from "../lib/storage";

export interface View {
  tx: number;
  ty: number;
  scale: number;
}

export type Selection =
  | { kind: "instance"; id: string }
  | { kind: "wire"; id: string }
  | { kind: "note"; id: string }
  | null;

const DEFAULT_VIEW: View = { tx: 0, ty: 0, scale: 1 };

/** Rácsosztás (pixel) a snap-hez — egyezik a Canvas GRID értékével. */
export const GRID = 20;

function snapTo(v: number, on: boolean): number {
  return on ? Math.round(v / GRID) * GRID : Math.round(v);
}

export function useEditor() {
  const [project, setProject] = useState<Project>(
    () => loadLocal() ?? emptyProject(),
  );
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<PinRef | null>(null);
  const [hint, setHint] = useState<string>("");
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  // Undo + redo verem (csak a projektre).
  const past = useRef<Project[]>([]);
  const future = useRef<Project[]>([]);
  const [histVersion, setHistVersion] = useState(0); // kényszerít re-rendert a gombok állapotához
  // A folyamatban lévő láb ref-je, hogy a clickPin ne ágyazzon setState-et.
  const pendingRef = useRef<PinRef | null>(null);

  // Automatikus mentés localStorage-ba, amikor a projekt változik.
  useEffect(() => {
    saveLocal(project);
  }, [project]);

  // Beállítások mentése + <html data-theme> beállítása a témához.
  useEffect(() => {
    saveSettings(settings);
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings]);

  const pushPast = useCallback((p: Project) => {
    past.current.push(p);
    if (past.current.length > 100) past.current.shift();
    future.current = []; // új művelet eldobja a redo-vermet
    setHistVersion((v) => v + 1);
  }, []);

  /** Projekt-módosítás undo-mentéssel. */
  const commit = useCallback(
    (updater: (p: Project) => Project) => {
      pushPast(project);
      setProject((prev) => updater(prev));
    },
    [project, pushPast],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev) {
      future.current.push(project);
      setProject(prev);
      setSelection(null);
      pendingRef.current = null;
      setPending(null);
      setHistVersion((v) => v + 1);
    }
  }, [project]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next) {
      past.current.push(project);
      setProject(next);
      setSelection(null);
      pendingRef.current = null;
      setPending(null);
      setHistVersion((v) => v + 1);
    }
  }, [project]);

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }));
    },
    [],
  );
  const toggleTheme = useCallback(() => {
    setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));
  }, []);

  const addInstance = useCallback(
    (defId: string, x: number, y: number) => {
      const def = getDef(defId);
      if (!def) return;
      const id = uid("i");
      const snap = settings.snap;
      commit((p) => ({
        ...p,
        instances: [
          ...p.instances,
          { id, defId, x: snapTo(x, snap), y: snapTo(y, snap) },
        ],
      }));
      setSelection({ kind: "instance", id });
    },
    [commit, settings.snap],
  );

  const moveInstance = useCallback(
    (id: string, x: number, y: number) => {
      // Mozgatás közben NEM mentünk undo-pontot minden lépésnél; csak az
      // állapotot frissítjük. (Az undo-pont a mozgatás kezdetén készül.)
      const snap = settings.snap;
      setProject((p) => ({
        ...p,
        instances: p.instances.map((i) =>
          i.id === id ? { ...i, x: snapTo(x, snap), y: snapTo(y, snap) } : i,
        ),
      }));
    },
    [settings.snap],
  );

  /** Kijelölt példány vagy jegyzet elmozgatása nyíl-billentyűkkel. */
  const nudgeSelection = useCallback(
    (dx: number, dy: number) => {
      if (!selection) return;
      if (selection.kind === "instance") {
        commit((p) => ({
          ...p,
          instances: p.instances.map((i) =>
            i.id === selection.id
              ? { ...i, x: Math.round(i.x + dx), y: Math.round(i.y + dy) }
              : i,
          ),
        }));
      } else if (selection.kind === "note") {
        commit((p) => ({
          ...p,
          notes: p.notes.map((n) =>
            n.id === selection.id
              ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) }
              : n,
          ),
        }));
      }
    },
    [selection, commit],
  );

  /** Kijelölt komponens duplikálása (kis eltolással). */
  const duplicateInstance = useCallback(
    (id: string) => {
      const src = project.instances.find((i) => i.id === id);
      if (!src) return;
      const nid = uid("i");
      commit((p) => ({
        ...p,
        instances: [...p.instances, { ...src, id: nid, x: src.x + 24, y: src.y + 24 }],
      }));
      setSelection({ kind: "instance", id: nid });
    },
    [project, commit],
  );

  /** Vízszintes tükrözés be/ki a kijelölt komponensen. */
  const toggleMirror = useCallback(
    (id: string) => {
      commit((p) => ({
        ...p,
        instances: p.instances.map((i) =>
          i.id === id ? { ...i, mirror: !i.mirror } : i,
        ),
      }));
    },
    [commit],
  );

  /** Undo-pont rögzítése (pl. mozgatás/akció kezdete előtt). */
  const snapshot = useCallback(() => {
    pushPast(project);
  }, [project, pushPast]);

  const deleteInstance = useCallback(
    (id: string) => {
      commit((p) => ({
        ...p,
        instances: p.instances.filter((i) => i.id !== id),
        wires: p.wires.filter(
          (w) => w.from.instanceId !== id && w.to.instanceId !== id,
        ),
      }));
      setSelection(null);
    },
    [commit],
  );

  const setInstanceLabel = useCallback(
    (id: string, label: string) => {
      commit((p) => ({
        ...p,
        instances: p.instances.map((i) =>
          i.id === id ? { ...i, label } : i,
        ),
      }));
    },
    [commit],
  );

  const setPendingBoth = useCallback((p: PinRef | null) => {
    pendingRef.current = p;
    setPending(p);
  }, []);

  /** Láb-kattintás: első kattintás kijelöli a forrást, második meghúzza a vezetéket. */
  const clickPin = useCallback(
    (ref: PinRef) => {
      const cur = pendingRef.current;
      if (!cur) {
        setPendingBoth(ref);
        setHint("Válaszd ki a másik lábat a vezeték befejezéséhez (Esc = mégse)");
        return;
      }
      // Ugyanaz a láb → mégse.
      if (sameRef(cur, ref)) {
        setPendingBoth(null);
        setHint("");
        return;
      }
      // Új vezeték.
      const wire: Wire = { id: uid("w"), from: cur, to: ref };
      commit((p) => {
        const dup = p.wires.some(
          (w) =>
            (sameRef(w.from, wire.from) && sameRef(w.to, wire.to)) ||
            (sameRef(w.from, wire.to) && sameRef(w.to, wire.from)),
        );
        return dup ? p : { ...p, wires: [...p.wires, wire] };
      });
      setPendingBoth(null);
      setSelection({ kind: "wire", id: wire.id });
      setHint("");
    },
    [commit, setPendingBoth],
  );

  const cancelPending = useCallback(() => {
    setPendingBoth(null);
    setHint("");
  }, [setPendingBoth]);

  const deleteWire = useCallback(
    (id: string) => {
      commit((p) => ({ ...p, wires: p.wires.filter((w) => w.id !== id) }));
      setSelection(null);
    },
    [commit],
  );

  const setWireColor = useCallback(
    (id: string, color: string) => {
      commit((p) => ({
        ...p,
        wires: p.wires.map((w) => (w.id === id ? { ...w, color } : w)),
      }));
    },
    [commit],
  );

  const setWireLabel = useCallback(
    (id: string, label: string) => {
      commit((p) => ({
        ...p,
        wires: p.wires.map((w) => (w.id === id ? { ...w, label } : w)),
      }));
    },
    [commit],
  );

  // ---- Jegyzetek ----
  const addNote = useCallback(
    (x: number, y: number) => {
      const id = uid("n");
      commit((p) => ({
        ...p,
        notes: [
          ...p.notes,
          { id, x: Math.round(x), y: Math.round(y), text: "Új jegyzet" },
        ],
      }));
      setSelection({ kind: "note", id });
    },
    [commit],
  );

  const moveNote = useCallback((id: string, x: number, y: number) => {
    setProject((p) => ({
      ...p,
      notes: p.notes.map((n) =>
        n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n,
      ),
    }));
  }, []);

  const setNoteText = useCallback(
    (id: string, text: string) => {
      commit((p) => ({
        ...p,
        notes: p.notes.map((n) => (n.id === id ? { ...n, text } : n)),
      }));
    },
    [commit],
  );

  const setNoteColor = useCallback(
    (id: string, color: string) => {
      commit((p) => ({
        ...p,
        notes: p.notes.map((n) => (n.id === id ? { ...n, color } : n)),
      }));
    },
    [commit],
  );

  const deleteNote = useCallback(
    (id: string) => {
      commit((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) }));
      setSelection(null);
    },
    [commit],
  );

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "instance") deleteInstance(selection.id);
    else if (selection.kind === "wire") deleteWire(selection.id);
    else deleteNote(selection.id);
  }, [selection, deleteInstance, deleteWire, deleteNote]);

  const loadProject = useCallback((p: Project) => {
    past.current = [];
    future.current = [];
    setHistVersion((v) => v + 1);
    setProject(p);
    setSelection(null);
    pendingRef.current = null;
    setPending(null);
    setView(DEFAULT_VIEW);
  }, []);

  const newProject = useCallback(() => {
    loadProject(emptyProject());
  }, [loadProject]);

  const renameProject = useCallback(
    (name: string) => {
      setProject((p) => ({ ...p, name }));
    },
    [],
  );

  /** Nézet igazítása a tartalomhoz. */
  const fitView = useCallback(
    (vpWidth: number, vpHeight: number) => {
      const b = contentBounds(project);
      const pad = 60;
      const scale = Math.min(
        3,
        Math.max(
          0.2,
          Math.min(
            vpWidth / (b.width + pad * 2),
            vpHeight / (b.height + pad * 2),
          ),
        ),
      );
      const tx = vpWidth / 2 - (b.x + b.width / 2) * scale;
      const ty = vpHeight / 2 - (b.y + b.height / 2) * scale;
      setView({ tx, ty, scale });
    },
    [project],
  );

  /** Nézet a kijelölt komponensre ráközelítve. */
  const fitSelection = useCallback(
    (vpWidth: number, vpHeight: number) => {
      if (selection?.kind !== "instance") return;
      const inst = project.instances.find((i) => i.id === selection.id);
      if (!inst) return;
      const b = instanceBounds(inst);
      if (!b) return;
      const pad = 120;
      const scale = Math.min(
        2.5,
        Math.max(
          0.3,
          Math.min(
            vpWidth / (b.width + pad * 2),
            vpHeight / (b.height + pad * 2),
          ),
        ),
      );
      setView({
        tx: vpWidth / 2 - (b.x + b.width / 2) * scale,
        ty: vpHeight / 2 - (b.y + b.height / 2) * scale,
        scale,
      });
    },
    [project, selection],
  );

  return {
    project,
    view,
    selection,
    pending,
    hint,
    settings,
    histVersion,
    setView,
    setSelection,
    setHint,
    setSetting,
    toggleTheme,
    addInstance,
    moveInstance,
    nudgeSelection,
    duplicateInstance,
    toggleMirror,
    snapshot,
    deleteInstance,
    setInstanceLabel,
    clickPin,
    cancelPending,
    deleteWire,
    setWireColor,
    setWireLabel,
    addNote,
    moveNote,
    setNoteText,
    setNoteColor,
    deleteNote,
    deleteSelection,
    loadProject,
    newProject,
    renameProject,
    fitView,
    fitSelection,
    undo,
    redo,
    canUndo: () => past.current.length > 0,
    canRedo: () => future.current.length > 0,
  };
}

function sameRef(a: PinRef, b: PinRef): boolean {
  return a.instanceId === b.instanceId && a.pinId === b.pinId;
}
