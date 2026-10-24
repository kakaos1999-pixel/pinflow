// Geometriai és szín-segédek.

import type { Bus, ComponentDef, Instance, Pin, PinRef, Project } from "../types";
import { getDef } from "../data/components";

/** Busz → alapértelmezett vezeték/láb szín. */
export const BUS_COLORS: Record<Bus, string> = {
  power: "#e5484d", // piros
  gnd: "#687076", // szürke
  gpio: "#3b82f6", // kék
  i2c: "#22c55e", // zöld
  spi: "#f59e0b", // narancs
  uart: "#a855f7", // lila
  i2s: "#ec4899", // rózsaszín
  pwm: "#eab308", // sárga
  analog: "#06b6d4", // ciánkék
  other: "#94a3b8", // halványszürke
};

export function busColor(bus?: Bus): string {
  return BUS_COLORS[bus ?? "other"];
}

/** Egy adott láb VILÁG-koordinátája (a példány eltolásával). */
export function pinWorldPos(
  instance: Instance,
  def: ComponentDef,
  pinId: string,
): { x: number; y: number } | null {
  const pin = def.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  return { x: instance.x + pin.x, y: instance.y + pin.y };
}

/** PinRef feloldása (példány + def + láb) a projekt alapján. */
export function resolvePin(
  project: Project,
  ref: PinRef,
): { instance: Instance; def: ComponentDef; pin: Pin } | null {
  const instance = project.instances.find((i) => i.id === ref.instanceId);
  if (!instance) return null;
  const def = getDef(instance.defId);
  if (!def) return null;
  const pin = def.pins.find((p) => p.id === ref.pinId);
  if (!pin) return null;
  return { instance, def, pin };
}

/** A teljes rajz befoglaló téglalapja (export/illesztés számára). */
export function contentBounds(project: Project): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (project.instances.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const inst of project.instances) {
    const def = getDef(inst.defId);
    if (!def) continue;
    minX = Math.min(minX, inst.x);
    minY = Math.min(minY, inst.y);
    maxX = Math.max(maxX, inst.x + def.width);
    maxY = Math.max(maxY, inst.y + def.height);
  }
  if (!isFinite(minX)) return { x: 0, y: 0, width: 800, height: 600 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

type Side = "left" | "right" | "top" | "bottom";

/** A vezérlőpont kilépési iránya a láb oldala szerint (kifelé a dobozból). */
function outDir(side: Side | undefined): number {
  return side === "left" ? -1 : 1; // bal él: balra, egyébként jobbra
}

/** Vezeték-útvonal: enyhe vízszintes Bézier, a lábak oldalától kifelé indulva. */
export function wirePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  aSide?: Side,
  bSide?: Side,
): string {
  const dx = Math.abs(b.x - a.x) || 1;
  const k = Math.max(36, Math.min(dx * 0.5, 140));
  const c1x = a.x + outDir(aSide) * k;
  const c2x = b.x + outDir(bSide) * k;
  return `M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`;
}
