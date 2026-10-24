// A szerkesztő központi állapota: projekt (undo-val), nézet (pan/zoom),
// kijelölés és a folyamatban lévő vezeték (első kattintott láb).

import { useCallback, useEffect, useRef, useState } from "react";
import type { PinRef, Project, Wire } from "../types";
import { emptyProject } from "../types";
import { getDef } from "../data/components";
import { uid } from "../lib/uid";
import { contentBounds } from "../lib/geometry";
import { loadLocal, saveLocal } from "../lib/storage";

export interface View {
  tx: number;
  ty: number;
  scale: number;
}

export type Selection =
  | { kind: "instance"; id: string }
  | { kind: "wire"; id: string }
  | null;

const DEFAULT_VIEW: View = { tx: 0, ty: 0, scale: 1 };

export function useEditor() {
  const [project, setProject] = useState<Project>(
    () => loadLocal() ?? emptyProject(),
  );
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<PinRef | null>(null);
  const [hint, setHint] = useState<string>("");

  // Undo verem (csak a projektre).
  const past = useRef<Project[]>([]);
  // A folyamatban lévő láb ref-je, hogy a clickPin ne ágyazzon setState-et.
  const pendingRef = useRef<PinRef | null>(null);

  // Automatikus mentés localStorage-ba, amikor a projekt változik.
  useEffect(() => {
    saveLocal(project);
  }, [project]);

  const pushPast = useCallback((p: Project) => {
    past.current.push(p);
    if (past.current.length > 100) past.current.shift();
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
      setProject(prev);
      setSelection(null);
      pendingRef.current = null;
      setPending(null);
    }
  }, []);

  const addInstance = useCallback(
    (defId: string, x: number, y: number) => {
      const def = getDef(defId);
      if (!def) return;
      const id = uid("i");
      commit((p) => ({
        ...p,
        instances: [
          ...p.instances,
          { id, defId, x: Math.round(x), y: Math.round(y) },
        ],
      }));
      setSelection({ kind: "instance", id });
    },
    [commit],
  );

  const moveInstance = useCallback(
    (id: string, x: number, y: number) => {
      // Mozgatás közben NEM mentünk undo-pontot minden lépésnél; csak az
      // állapotot frissítjük. (Az undo-pont a mozgatás kezdetén készül.)
      setProject((p) => ({
        ...p,
        instances: p.instances.map((i) =>
          i.id === id ? { ...i, x: Math.round(x), y: Math.round(y) } : i,
        ),
      }));
    },
    [],
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

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "instance") deleteInstance(selection.id);
    else deleteWire(selection.id);
  }, [selection, deleteInstance, deleteWire]);

  const loadProject = useCallback((p: Project) => {
    past.current = [];
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

  return {
    project,
    view,
    selection,
    pending,
    hint,
    setView,
    setSelection,
    setHint,
    addInstance,
    moveInstance,
    snapshot,
    deleteInstance,
    setInstanceLabel,
    clickPin,
    cancelPending,
    deleteWire,
    setWireColor,
    deleteSelection,
    loadProject,
    newProject,
    renameProject,
    fitView,
    undo,
    canUndo: () => past.current.length > 0,
  };
}

function sameRef(a: PinRef, b: PinRef): boolean {
  return a.instanceId === b.instanceId && a.pinId === b.pinId;
}
