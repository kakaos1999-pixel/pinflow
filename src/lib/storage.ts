// Mentés / betöltés: localStorage automatikus mentés + JSON fájl export/import.

import type { Project } from "../types";
import { emptyProject, PROJECT_VERSION } from "../types";

const LS_KEY = "pinflow:project";

/** Automatikus mentés localStorage-ba (hibatűrő). */
export function saveLocal(project: Project): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(project));
  } catch {
    // privát mód / tele tároló — csendben elnyeljük
  }
}

/** Betöltés localStorage-ból, ha van érvényes mentés. */
export function loadLocal(): Project | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Beolvasott objektum ellenőrzése + hiányzó mezők pótlása. */
export function normalize(data: unknown): Project {
  const base = emptyProject();
  if (!data || typeof data !== "object") return base;
  const d = data as Partial<Project>;
  return {
    version: PROJECT_VERSION,
    name: typeof d.name === "string" ? d.name : base.name,
    instances: Array.isArray(d.instances) ? d.instances : [],
    wires: Array.isArray(d.wires) ? d.wires : [],
    // v1 projektekben nincs `notes` — üres tömbbel pótoljuk.
    notes: Array.isArray(d.notes) ? d.notes : [],
  };
}

/** Projekt letöltése .json fájlként. */
export function exportJson(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${safeName(project.name)}.pinflow.json`);
}

/** JSON fájl beolvasása Project-té. */
export function importJson(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(normalize(JSON.parse(String(reader.result))));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeName(name: string): string {
  return (name || "pinflow").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60);
}

/** Szöveg letöltése tetszőleges fájlként (pl. CSV netlista/BOM export). */
export function downloadText(text: string, filename: string, mime = "text/plain"): void {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

// ---- UI-beállítások (téma, snap, derékszögű útvonal) ----
const SETTINGS_KEY = "pinflow:settings";

export interface Settings {
  theme: "light" | "dark";
  snap: boolean;
  ortho: boolean;
}

const DEFAULT_SETTINGS: Settings = { theme: "light", snap: true, ortho: false };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // csendben elnyeljük
  }
}
