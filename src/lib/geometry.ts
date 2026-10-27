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

/** A láb helyi geometriája a példány tükrözését is figyelembe véve.
 *  Tükrözésnél a bal és jobb oldal helyet cserél (x = width - x). */
export function placedPin(def: ComponentDef, instance: Instance, pin: Pin): Pin {
  if (!instance.mirror) return pin;
  return {
    ...pin,
    x: def.width - pin.x,
    side:
      pin.side === "left" ? "right" : pin.side === "right" ? "left" : pin.side,
  };
}

/** A példány összes lába, tükrözés-korrekcióval. */
export function placedPins(def: ComponentDef, instance: Instance): Pin[] {
  return def.pins.map((p) => placedPin(def, instance, p));
}

/** Egy adott láb VILÁG-koordinátája (a példány eltolásával + tükrözésével). */
export function pinWorldPos(
  instance: Instance,
  def: ComponentDef,
  pinId: string,
): { x: number; y: number } | null {
  const raw = def.pins.find((p) => p.id === pinId);
  if (!raw) return null;
  const pin = placedPin(def, instance, raw);
  return { x: instance.x + pin.x, y: instance.y + pin.y };
}

/** PinRef feloldása (példány + def + láb, tükrözés-korrigált lábbal). */
export function resolvePin(
  project: Project,
  ref: PinRef,
): { instance: Instance; def: ComponentDef; pin: Pin } | null {
  const instance = project.instances.find((i) => i.id === ref.instanceId);
  if (!instance) return null;
  const def = getDef(instance.defId);
  if (!def) return null;
  const raw = def.pins.find((p) => p.id === ref.pinId);
  if (!raw) return null;
  return { instance, def, pin: placedPin(def, instance, raw) };
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

/** Egyetlen példány befoglaló téglalapja (zoom-a-kijelöléshez). */
export function instanceBounds(
  instance: Instance,
): { x: number; y: number; width: number; height: number } | null {
  const def = getDef(instance.defId);
  if (!def) return null;
  return { x: instance.x, y: instance.y, width: def.width, height: def.height };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Minden komponens-példány befoglaló téglalapja — vezeték-akadályként. */
export function obstacleRects(project: Project): Rect[] {
  const rects: Rect[] = [];
  for (const inst of project.instances) {
    const def = getDef(inst.defId);
    if (def) rects.push({ x: inst.x, y: inst.y, width: def.width, height: def.height });
  }
  return rects;
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

/** Derékszögű (Manhattan) útvonal: a lábaktól egy rövid szakasz kifelé,
 *  majd vízszintes-függőleges lépcsők a két oldal közti felezővonalnál. */
export function orthoPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  aSide?: Side,
  bSide?: Side,
): string {
  const stub = 16;
  const ax2 = a.x + outDir(aSide) * stub;
  const bx2 = b.x + outDir(bSide) * stub;
  const midX = (ax2 + bx2) / 2;
  return `M ${a.x} ${a.y} L ${ax2} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${bx2} ${b.y} L ${b.x} ${b.y}`;
}

// ---- Eszköz-kikerülő (obstacle-avoiding) útvonaltervezés ----
//
// Cél: a vezeték NE fusson át egy komponens doboza alatt — ha a közvetlen
// útvonal keresztezne egy eszközt, a vezeték KERÜLJE KI (fölötte/alatta vagy
// mellette), így egyértelmű marad, melyik lábhoz tartozik.

type P = { x: number; y: number };

const MARGIN = 14; // kerülési ráhagyás az eszköz körül
const STUB = 22; // a lábtól kifelé induló szakasz (> MARGIN)
const LANE_GAP = 16; // a kerülő-sáv távolsága az akadálytól
const NEAR = STUB + MARGIN + 6; // a lábhoz közeli szakaszt nem vizsgáljuk

function inflate(r: Rect, m: number): Rect {
  return { x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m };
}

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px > r.x && px < r.x + r.width && py > r.y && py < r.y + r.height;
}

/** Tengely-párhuzamos szakasz metszi-e a téglalap BELSEJÉT (az élen futás OK). */
function segHitsRect(x0: number, y0: number, x1: number, y1: number, r: Rect): boolean {
  const left = r.x, right = r.x + r.width, top = r.y, bottom = r.y + r.height;
  if (y0 === y1) {
    if (y0 <= top || y0 >= bottom) return false;
    return Math.max(x0, x1) > left && Math.min(x0, x1) < right;
  }
  if (x0 === x1) {
    if (x0 <= left || x0 >= right) return false;
    return Math.max(y0, y1) > top && Math.min(y0, y1) < bottom;
  }
  return (
    Math.max(x0, x1) > left &&
    Math.min(x0, x1) < right &&
    Math.max(y0, y1) > top &&
    Math.min(y0, y1) < bottom
  );
}

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Mintapontok a Bézier-útvonal mentén (keresztezés-vizsgálathoz). */
function bezierSamples(a: P, b: P, aSide?: Side, bSide?: Side, n = 28): P[] {
  const dx = Math.abs(b.x - a.x) || 1;
  const k = Math.max(36, Math.min(dx * 0.5, 140));
  const p1x = a.x + outDir(aSide) * k;
  const p2x = b.x + outDir(bSide) * k;
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: cubicAt(t, a.x, p1x, p2x, b.x), y: cubicAt(t, a.y, a.y, b.y, b.y) });
  }
  return pts;
}

function orthoPoints(a: P, b: P, aSide?: Side, bSide?: Side): P[] {
  const ax2 = a.x + outDir(aSide) * 16;
  const bx2 = b.x + outDir(bSide) * 16;
  const midX = (ax2 + bx2) / 2;
  return [a, { x: ax2, y: a.y }, { x: midX, y: a.y }, { x: midX, y: b.y }, { x: bx2, y: b.y }, b];
}

function polylineSamples(points: P[], step = 7): P[] {
  const out: P[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i], q = points[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const n = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

/** Keresztezi-e a közvetlen útvonal valamelyik (felfújt) eszközt? (láb-közeli rész kihagyva) */
function directClear(a: P, b: P, aSide: Side | undefined, bSide: Side | undefined, ortho: boolean, infl: Rect[]): boolean {
  const pts = ortho
    ? polylineSamples(orthoPoints(a, b, aSide, bSide))
    : bezierSamples(a, b, aSide, bSide);
  for (const p of pts) {
    if (Math.hypot(p.x - a.x, p.y - a.y) < NEAR || Math.hypot(p.x - b.x, p.y - b.y) < NEAR)
      continue;
    for (const r of infl) if (pointInRect(p.x, p.y, r)) return false;
  }
  return true;
}

/** A közbülső (nem láb-kilépő) szakaszok szabadok-e? */
function midSegmentsClear(points: P[], infl: Rect[]): boolean {
  for (let i = 1; i < points.length - 2; i++) {
    const p = points[i], q = points[i + 1];
    for (const r of infl) if (segHitsRect(p.x, p.y, q.x, q.y, r)) return false;
  }
  return true;
}

/** Kerülő derékszögű útvonal: a lábaktól kifelé, majd az akadály fölött/alatt
 *  vagy mellett elvezetve. A sávot kifelé tágítjuk, míg szabad utat nem találunk. */
function avoidRoute(a: P, b: P, aSide?: Side, bSide?: Side, obstacles: Rect[] = []): P[] | null {
  const infl = obstacles.map((r) => inflate(r, MARGIN));
  const aStub: P = { x: a.x + outDir(aSide) * STUB, y: a.y };
  const bStub: P = { x: b.x + outDir(bSide) * STUB, y: b.y };

  const xmin = Math.min(aStub.x, bStub.x), xmax = Math.max(aStub.x, bStub.x);
  const ymin = Math.min(aStub.y, bStub.y), ymax = Math.max(aStub.y, bStub.y);
  const blocking = infl.filter(
    (r) => r.x < xmax && r.x + r.width > xmin && r.y < ymax && r.y + r.height > ymin,
  );
  if (blocking.length === 0) return null;

  const topY = Math.min(...blocking.map((r) => r.y));
  const botY = Math.max(...blocking.map((r) => r.y + r.height));
  const leftX = Math.min(...blocking.map((r) => r.x));
  const rightX = Math.max(...blocking.map((r) => r.x + r.width));
  const baseY = (aStub.y + bStub.y) / 2;
  const baseX = (aStub.x + bStub.x) / 2;

  // Kerülő-sávok a láboldaltól mért "költség" szerint rendezve.
  type Lane = { kind: "h" | "v"; from: number; dir: 1 | -1; cost: number };
  const lanes = [
    { kind: "h", from: topY, dir: -1, cost: Math.abs(baseY - topY) }, // fölötte
    { kind: "h", from: botY, dir: 1, cost: Math.abs(botY - baseY) }, // alatta
    { kind: "v", from: leftX, dir: -1, cost: Math.abs(baseX - leftX) }, // balra
    { kind: "v", from: rightX, dir: 1, cost: Math.abs(rightX - baseX) }, // jobbra
  ] as Lane[];
  lanes.sort((p, q) => p.cost - q.cost);

  const MAX = LANE_GAP + 400;
  for (const lane of lanes) {
    for (let gap = LANE_GAP; gap <= MAX; gap += 14) {
      const route =
        lane.kind === "h"
          ? [a, aStub, { x: aStub.x, y: lane.from + lane.dir * gap }, { x: bStub.x, y: lane.from + lane.dir * gap }, bStub, b]
          : [a, aStub, { x: lane.from + lane.dir * gap, y: aStub.y }, { x: lane.from + lane.dir * gap, y: bStub.y }, bStub, b];
      if (midSegmentsClear(route, infl)) return route;
    }
  }
  return null;
}

/** Egymásra eső / egyvonalban lévő pontok összevonása. */
function simplify(points: P[]): P[] {
  const out: P[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2], b = out[out.length - 1];
      // kollineáris (vízszintes vagy függőleges) → a középső pont elhagyható
      if ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)) out.pop();
    }
    out.push(p);
  }
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Pont-lista SVG útvonallá; rounded=true esetén lekerekített sarkokkal. */
export function polyPath(points: P[], rounded: boolean, radius = 8): string {
  const pts = simplify(points);
  if (pts.length < 2) return "";
  if (!rounded) {
    return "M " + pts.map((p) => `${r2(p.x)} ${r2(p.y)}`).join(" L ");
  }
  let d = `M ${r2(pts[0].x)} ${r2(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(radius, d1 / 2, d2 / 2);
    const a1 = { x: p1.x - ((p1.x - p0.x) / d1) * rr, y: p1.y - ((p1.y - p0.y) / d1) * rr };
    const a2 = { x: p1.x + ((p2.x - p1.x) / d2) * rr, y: p1.y + ((p2.y - p1.y) / d2) * rr };
    d += ` L ${r2(a1.x)} ${r2(a1.y)} Q ${r2(p1.x)} ${r2(p1.y)} ${r2(a2.x)} ${r2(a2.y)}`;
  }
  const end = pts[pts.length - 1];
  d += ` L ${r2(end.x)} ${r2(end.y)}`;
  return d;
}

/** Útvonal a routing-mód szerint; ha megadunk akadályokat és a közvetlen út
 *  keresztezne egy eszközt, kerülő (derékszögű) útvonalat ad vissza. */
export function routeWire(
  a: P,
  b: P,
  aSide?: Side,
  bSide?: Side,
  ortho?: boolean,
  obstacles?: Rect[],
): string {
  if (obstacles && obstacles.length) {
    const infl = obstacles.map((r) => inflate(r, MARGIN));
    if (!directClear(a, b, aSide, bSide, !!ortho, infl)) {
      const route = avoidRoute(a, b, aSide, bSide, obstacles);
      if (route) return polyPath(route, !ortho);
    }
  }
  return ortho ? orthoPath(a, b, aSide, bSide) : wirePath(a, b, aSide, bSide);
}

/** Két pont felezőpontja — vezeték-címke elhelyezéséhez. */
export function midPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ====================================================================
// KÖTEG-ÚTVONALTERVEZÉS (cable-harness)
// ====================================================================
//
// A vezetékeket NEM egyenként, hanem EGYÜTT tervezzük: derékszögű (Manhattan)
// útvonalak, majd az egymásra eső párhuzamos szakaszokat külön "sávokba"
// (track) húzzuk szét, hogy ne lapoljanak egymásra, hanem rendezett
// kábelkötegként fussanak egymás mellett.

const TRACK = 7; // sáv-összevonási tűrés (a tényleges sávtáv adaptív: lásd separateTracks)
const CHANNEL = 26; // ennyin belül egy csatornának számít (összevonási tűrés)
const SPINE_GAP = STUB; // a trunk-gerinc távolsága a síntől (így a gerinc a sín-csonkra ül)

/** Táp-/föld-sín komponens-e? (railgnd, rail6v, rail5v, rail3v3 — "Táp-sín" kategória) */
function isRailDef(def: ComponentDef): boolean {
  return def.id.startsWith("rail") || def.category === "Táp-sín";
}

/** Derékszögű H-V-H útvonal pontlistája (a lábaktól kifelé, közös függőleges csatornán át).
 *  cxOverride: a középső függőleges csatorna x-e (trunk/gerinc kényszerítéséhez). */
function hvhPoints(a: P, b: P, aSide?: Side, bSide?: Side, cxOverride?: number): P[] {
  const ax2 = a.x + outDir(aSide) * STUB;
  const bx2 = b.x + outDir(bSide) * STUB;
  const cx = cxOverride ?? (ax2 + bx2) / 2;
  return [
    { x: a.x, y: a.y },
    { x: ax2, y: a.y },
    { x: cx, y: a.y },
    { x: cx, y: b.y },
    { x: bx2, y: b.y },
    { x: b.x, y: b.y },
  ];
}

/** Egy vezeték alap-útvonala (derékszögű): kerülő, ha eszközt keresztezne. */
function baseRoute(a: P, b: P, aSide: Side | undefined, bSide: Side | undefined, obstacles: Rect[]): P[] {
  if (obstacles.length) {
    const infl = obstacles.map((r) => inflate(r, MARGIN));
    if (!directClear(a, b, aSide, bSide, true, infl)) {
      const r = avoidRoute(a, b, aSide, bSide, obstacles);
      if (r) return r.map((p) => ({ ...p }));
    }
  }
  return hvhPoints(a, b, aSide, bSide);
}

/** Az egymásra eső párhuzamos szakaszokat sávokba húzza szét.
 *  orient='v': függőleges szakaszokat x-ben, 'h': vízszinteseket y-ban tol el.
 *  Csak a "belső" (mindkét végén merőleges szomszéddal bíró) szakaszokat mozgatja,
 *  így a lábaktól kiinduló csonkok a helyükön maradnak. */
function separateTracks(lists: P[][], orient: "v" | "h"): void {
  type Seg = { li: number; i: number; pos: number; lo: number; hi: number };
  const segs: Seg[] = [];

  for (let li = 0; li < lists.length; li++) {
    const pts = lists[li];
    for (let i = 1; i < pts.length - 2; i++) {
      const p = pts[i], q = pts[i + 1];
      const isV = Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) >= 0.5;
      const isH = Math.abs(p.y - q.y) < 0.01 && Math.abs(p.x - q.x) >= 0.5;
      if (orient === "v" && isV) {
        // a szomszédos szakaszok legyenek vízszintesek (merőlegesek)
        if (Math.abs(pts[i - 1].y - p.y) > 0.01 || Math.abs(pts[i + 2].y - q.y) > 0.01) continue;
        segs.push({ li, i, pos: p.x, lo: Math.min(p.y, q.y), hi: Math.max(p.y, q.y) });
      } else if (orient === "h" && isH) {
        if (Math.abs(pts[i - 1].x - p.x) > 0.01 || Math.abs(pts[i + 2].x - q.x) > 0.01) continue;
        segs.push({ li, i, pos: p.y, lo: Math.min(p.x, q.x), hi: Math.max(p.x, q.x) });
      }
    }
  }

  // Csatornánként (közel azonos pozíció) csoportosítunk, majd az átfedő
  // szakaszokat sávokra bontjuk.
  const buckets = new Map<number, Seg[]>();
  for (const s of segs) {
    const key = Math.round(s.pos / CHANNEL);
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(s);
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    let group: Seg[] = [];
    let groupHi = -Infinity;
    const flush = () => {
      if (group.length > 1) {
        const n = group.length;
        // Adaptív sávtáv: sok vezeték egy csatornában → szűkebb (5px),
        // kevés → tágabb (10px), hogy a rajz ne nőjön túl szélesre, de olvasható maradjon.
        const spacing = Math.max(5, Math.min(10, 12 - n));
        group.forEach((s, k) => {
          const off = (k - (n - 1) / 2) * spacing;
          const pts = lists[s.li];
          if (orient === "v") {
            pts[s.i].x += off;
            pts[s.i + 1].x += off;
          } else {
            pts[s.i].y += off;
            pts[s.i + 1].y += off;
          }
        });
      }
      group = [];
      groupHi = -Infinity;
    };
    for (const s of list) {
      if (group.length === 0 || s.lo <= groupHi + TRACK) {
        group.push(s);
        groupHi = Math.max(groupHi, s.hi);
      } else {
        flush();
        group.push(s);
        groupHi = s.hi;
      }
    }
    flush();
  }
}

/** Minden vezeték útvonala EGYÜTT megtervezve, kötegelt (párhuzamos) elrendezéssel.
 *  A táp-/föld-sínekre futó vezetékek KÖZÖS GERINCBE (trunk) állnak össze: a
 *  sín mellett egyetlen függőleges gerincen futnak, és csak rövid leágazásokkal
 *  (tap) csatlakoznak a forrás-lábhoz, illetve a sín lábaihoz. Így a sok
 *  azonos-net (pl. GND) vezeték egyetlen vonallá fogható össze.
 *  Visszaad: vezeték-id → SVG path d. */
export function routeWires(
  project: Project,
  obstacles: Rect[],
  ortho: boolean,
): Map<string, string> {
  const map = new Map<string, string>();
  const ids: string[] = [];
  const lists: P[][] = [];

  for (const w of project.wires) {
    const a = resolvePin(project, w.from);
    const b = resolvePin(project, w.to);
    if (!a || !b) continue;
    const pa = pinWorldPos(a.instance, a.def, a.pin.id)!;
    const pb = pinWorldPos(b.instance, b.def, b.pin.id)!;

    const aRail = isRailDef(a.def);
    const bRail = isRailDef(b.def);

    if (aRail !== bRail) {
      // Pontosan egy vég sín → TRUNK: a gerinc a sín mellett, közös x-en.
      const srcSide = aRail ? b.pin.side : a.pin.side;
      const railSide = aRail ? a.pin.side : b.pin.side;
      const pSrc = aRail ? pb : pa;
      const pRail = aRail ? pa : pb;
      // A gerinc a sín-lábak oldalán kívül, minden azonos sínű vezetéknél közös x.
      const spineX = pRail.x + (railSide === "left" ? -1 : 1) * SPINE_GAP;
      // Leágazás (tap): a forrástól a GERINCIG, a forrás magasságában beágazva.
      // Ha a közvetlen vízszintes leágazás eszközt keresztezne, kerülő úton
      // (fölötte/alatta) fut, majd a forrás magasságában tér vissza a gerincre
      // — így nem vág át komponensen, de a becsatlakozás a forrásnál marad.
      // A sín felőli stub-ot a railSide adja, mert a gerinc a sín-lábak oldalán van.
      const J: P = { x: spineX, y: pSrc.y };
      const tap =
        avoidRoute(pSrc, J, srcSide, railSide, obstacles) ??
        [pSrc, { x: pSrc.x + outDir(srcSide) * STUB, y: pSrc.y }, J];
      // Gerinc (közös, szándékosan egymásra ül) + a sín-láb becsatlakozása.
      const pts: P[] = [
        ...tap,
        { x: spineX, y: pRail.y },
        { x: pRail.x, y: pRail.y },
      ];
      // A trunk-vezetékek NEM mennek a sáv-széthúzáson át — a gerincük
      // szándékosan egymásra ül (egy közös vonal).
      map.set(w.id, polyPath(pts, !ortho));
    } else {
      ids.push(w.id);
      lists.push(baseRoute(pa, pb, a.pin.side, b.pin.side, obstacles));
    }
  }

  // A sima (nem-trunk) vezetékeknél előbb a függőleges csatornákat, majd a
  // vízszintes sávokat húzzuk szét, hogy ne lapoljanak egymásra.
  separateTracks(lists, "v");
  separateTracks(lists, "h");
  ids.forEach((id, idx) => map.set(id, polyPath(lists[idx], !ortho)));

  return map;
}
