// Rajz-elemzés: netlista (kapcsolati lista), alkatrészlista (BOM) és
// egyszerű tervezési-szabály-ellenőrzés (DRC). Tiszta függvények — a UI csak
// megjeleníti őket, és CSV-be exportálja.

import type { Project } from "../types";
import { getDef } from "../data/components";
import { resolvePin } from "./geometry";

export interface NetRow {
  wireId: string;
  fromComp: string;
  fromPin: string;
  toComp: string;
  toPin: string;
  color: string;
  label: string;
}

export interface BomRow {
  defId: string;
  name: string;
  category: string;
  count: number;
}

export type IssueLevel = "error" | "warning" | "info";
export interface Issue {
  level: IssueLevel;
  message: string;
}

/** Egy példány megjelenített neve (címke vagy típusnév). */
function compName(project: Project, instanceId: string): string {
  const inst = project.instances.find((i) => i.id === instanceId);
  if (!inst) return "?";
  const def = getDef(inst.defId);
  return inst.label || def?.name || inst.defId;
}

/** Kapcsolati lista: minden vezeték egy sor, feloldott láb-nevekkel. */
export function buildNetlist(project: Project): NetRow[] {
  const rows: NetRow[] = [];
  for (const w of project.wires) {
    const a = resolvePin(project, w.from);
    const b = resolvePin(project, w.to);
    if (!a || !b) continue;
    rows.push({
      wireId: w.id,
      fromComp: compName(project, w.from.instanceId),
      fromPin: a.pin.name,
      toComp: compName(project, w.to.instanceId),
      toPin: b.pin.name,
      color: w.color ?? "",
      label: w.label ?? "",
    });
  }
  return rows;
}

/** Alkatrészlista: komponens-típusonkénti darabszám. */
export function buildBom(project: Project): BomRow[] {
  const map = new Map<string, BomRow>();
  for (const inst of project.instances) {
    const def = getDef(inst.defId);
    const key = inst.defId;
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else
      map.set(key, {
        defId: key,
        name: def?.name ?? key,
        category: def?.category ?? "",
        count: 1,
      });
  }
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "hu"));
}

function is5V(name: string, sub?: string): boolean {
  return /\b5v\b|\bvin\b|\+5/i.test(name) || /\b5v\b|\+5/i.test(sub ?? "");
}
function is3V3(name: string, sub?: string): boolean {
  return /3v3|3\.3/i.test(name) || /3v3|3\.3/i.test(sub ?? "");
}

/** Egyszerű tervezési-szabály-ellenőrzés. Nem teljes körű — segítő jelzés. */
export function runDrc(project: Project): Issue[] {
  const issues: Issue[] = [];

  for (const w of project.wires) {
    const a = resolvePin(project, w.from);
    const b = resolvePin(project, w.to);
    if (!a || !b) continue;
    const an = `${a.instance.label || a.def.name}·${a.pin.name}`;
    const bn = `${b.instance.label || b.def.name}·${b.pin.name}`;

    // 1) Táp ↔ föld közvetlen összekötés = rövidzár.
    if (
      (a.pin.bus === "power" && b.pin.bus === "gnd") ||
      (a.pin.bus === "gnd" && b.pin.bus === "power")
    ) {
      issues.push({
        level: "error",
        message: `Lehetséges rövidzár: ${an} ↔ ${bn} (táp a földre kötve).`,
      });
    }

    // 2) 5V tápsín 3V3 tápsínre kötve = eltérő feszültség.
    const a5 = is5V(a.pin.name, a.pin.sub);
    const b5 = is5V(b.pin.name, b.pin.sub);
    const a33 = is3V3(a.pin.name, a.pin.sub);
    const b33 = is3V3(b.pin.name, b.pin.sub);
    if (
      a.pin.bus === "power" &&
      b.pin.bus === "power" &&
      ((a5 && b33) || (a33 && b5))
    ) {
      issues.push({
        level: "warning",
        message: `Eltérő tápfeszültség összekötve: ${an} ↔ ${bn} (5V vs 3V3).`,
      });
    }
  }

  // 3) Ugyanarra a lábra sok vezeték köt (lehet szándékos busz is).
  const pinUse = new Map<string, number>();
  for (const w of project.wires) {
    for (const r of [w.from, w.to]) {
      const k = `${r.instanceId}:${r.pinId}`;
      pinUse.set(k, (pinUse.get(k) ?? 0) + 1);
    }
  }
  for (const [k, n] of pinUse) {
    if (n >= 4) {
      const [iid, pid] = k.split(":");
      const r = resolvePin(project, { instanceId: iid, pinId: pid });
      if (r)
        issues.push({
          level: "info",
          message: `${r.instance.label || r.def.name}·${r.pin.name}: ${n} vezeték csatlakozik ide.`,
        });
    }
  }

  // 4) Bekötetlen komponensek.
  const connected = new Set<string>();
  for (const w of project.wires) {
    connected.add(w.from.instanceId);
    connected.add(w.to.instanceId);
  }
  for (const inst of project.instances) {
    if (!connected.has(inst.id)) {
      const def = getDef(inst.defId);
      issues.push({
        level: "info",
        message: `Bekötetlen komponens: ${inst.label || def?.name || inst.defId}.`,
      });
    }
  }

  return issues;
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function netlistToCsv(rows: NetRow[]): string {
  const head = "Honnan;Láb;Hova;Láb;Szín;Címke";
  const body = rows.map((r) =>
    [r.fromComp, r.fromPin, r.toComp, r.toPin, r.color, r.label]
      .map(csvCell)
      .join(";"),
  );
  return [head, ...body].join("\n");
}

export function bomToCsv(rows: BomRow[]): string {
  const head = "Komponens;Kategória;Darab";
  const body = rows.map((r) =>
    [r.name, r.category, String(r.count)].map(csvCell).join(";"),
  );
  return [head, ...body].join("\n");
}
