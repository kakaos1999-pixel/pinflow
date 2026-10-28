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
// A* RÁCS-ÚTVONALTERVEZÉS (akadály-kerülő)
// ====================================================================
//
// Minden vezetéket közös rácson, A*-gal tervezünk: a komponens-dobozok
// (+ CLEAR hézag) blokkolt cellák, így a vezeték SOHA nem fut komponens
// alatt, hanem a szabad folyosókon kerül. Forduló-büntetés (TURN_PEN) →
// kevés sarkú, tiszta vonalak. "Congestion" (a már használt cellák
// többletköltsége) → a párhuzamos vezetékek szétterülnek, nem fedik
// egymást. A vezeték SAJÁT két végkomponense a tervezés idejére szabad,
// hogy a láb-kilépés elérhető legyen.

const GRID = 10; // rács-cella mérete (px)
const CLEAR = 7; // minimum hézag a komponens-dobozoktól (cella-blokkolás)
const TURN_PEN = 16; // forduló-büntetés (kevesebb sarok, tisztább vonalak)
const CONGEST_PEN = 22; // már használt cellánkénti többletköltség (szétterítés)
const EXIT = CLEAR + GRID; // a lábtól merőlegesen kifelé induló stub hossza

const DC = [1, -1, 0, 0]; // irány → Δoszlop
const DR = [0, 0, 1, -1]; // irány → Δsor

interface Grid {
  cols: number;
  rows: number;
  ox: number;
  oy: number;
  block: Int32Array; // cellánként: hány komponens fedi (0 = szabad)
}

/** Rács felépítése: a komponens-dobozok (+ CLEAR) cellái blokkoltak. */
function buildGrid(project: Project): Grid {
  const b = contentBounds(project);
  const PAD = 80;
  const ox = b.x - PAD;
  const oy = b.y - PAD;
  const cols = Math.ceil((b.width + 2 * PAD) / GRID) + 1;
  const rows = Math.ceil((b.height + 2 * PAD) / GRID) + 1;
  const block = new Int32Array(cols * rows);
  const cl = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
  for (const inst of project.instances) {
    const def = getDef(inst.defId);
    if (!def) continue;
    const c0 = cl(Math.ceil((inst.x - CLEAR - ox) / GRID), cols - 1);
    const c1 = cl(Math.floor((inst.x + def.width + CLEAR - ox) / GRID), cols - 1);
    const r0 = cl(Math.ceil((inst.y - CLEAR - oy) / GRID), rows - 1);
    const r1 = cl(Math.floor((inst.y + def.height + CLEAR - oy) / GRID), rows - 1);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) block[r * cols + c]++;
  }
  return { cols, rows, ox, oy, block };
}

/** Szabad-e (nem blokkolt) a cella? */
function cellFree(g: Grid, c: number, r: number): boolean {
  return c >= 0 && c < g.cols && r >= 0 && r < g.rows && g.block[r * g.cols + c] === 0;
}

/** A láb be/kilépő rács-csomópontja: EXIT-nyire kifelé, a láb magasságában —
 *  így tiszta MERŐLEGES stub indul/érkezik a lábnál. Ha ott blokkolt (bedobozolt
 *  láb), a láb cellájából indulunk, és az A* kerüli ki az akadályt. */
function pinNode(g: Grid, px: number, py: number, dir: number): { c: number; r: number } | null {
  const row = Math.round((py - g.oy) / GRID);
  const exitCol = Math.round((px + dir * EXIT - g.ox) / GRID);
  if (cellFree(g, exitCol, row)) return { c: exitCol, r: row };
  const pinCol = Math.round((px - g.ox) / GRID);
  return freeNode(g, pinCol, row, dir);
}

/** A megadott cellához legközelebbi SZABAD cella (előbb a kilépés irányában). */
function freeNode(
  g: Grid,
  c: number,
  r: number,
  dir: number,
): { c: number; r: number } | null {
  const { cols, rows, block } = g;
  const ok = (cc: number, rr: number) =>
    cc >= 0 && cc < cols && rr >= 0 && rr < rows && block[rr * cols + cc] === 0;
  if (ok(c, r)) return { c, r };
  const sx = dir === 0 ? 1 : dir; // oszlop-lépés iránya a kilépéshez
  for (let d = 1; d <= 40; d++) {
    const cand: [number, number][] = [
      [c + sx * d, r],
      [c, r - d],
      [c, r + d],
      [c + sx * d, r - d],
      [c + sx * d, r + d],
      [c - sx * d, r],
    ];
    for (const [cc, rr] of cand) if (ok(cc, rr)) return { c: cc, r: rr };
  }
  return null;
}

interface AStarWork {
  gVal: Float64Array;
  gGen: Int32Array;
  came: Int32Array;
  gen: number;
}

/** A* a rácson (állapot = cella×irány, forduló- és congestion-költséggel). */
function aStar(
  g: Grid,
  usage: Float64Array,
  sc: number,
  sr: number,
  gc: number,
  gr: number,
  wk: AStarWork,
): { c: number; r: number }[] | null {
  const { cols, rows, block } = g;
  const { gVal, gGen, came, gen } = wk;
  const goalNode = gr * cols + gc;
  const startNode = sr * cols + sc;
  const hCost = (c: number, r: number) =>
    (Math.abs(c - gc) + Math.abs(r - gr)) * GRID;

  // bináris min-kupac (f, state)
  const hf: number[] = [];
  const hs: number[] = [];
  const push = (f: number, s: number) => {
    hf.push(f);
    hs.push(s);
    let i = hf.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] <= hf[i]) break;
      const tf = hf[p]; hf[p] = hf[i]; hf[i] = tf;
      const ts = hs[p]; hs[p] = hs[i]; hs[i] = ts;
      i = p;
    }
  };
  const pop = (): number => {
    const top = hs[0];
    const n = hf.length - 1;
    hf[0] = hf[n]; hs[0] = hs[n];
    hf.pop(); hs.pop();
    let i = 0;
    const len = hf.length;
    while (true) {
      const l = 2 * i + 1, rc = 2 * i + 2;
      let m = i;
      if (l < len && hf[l] < hf[m]) m = l;
      if (rc < len && hf[rc] < hf[m]) m = rc;
      if (m === i) break;
      const tf = hf[m]; hf[m] = hf[i]; hf[i] = tf;
      const ts = hs[m]; hs[m] = hs[i]; hs[i] = ts;
      i = m;
    }
    return top;
  };

  for (let d = 0; d < 4; d++) {
    const s = startNode * 4 + d;
    gGen[s] = gen; gVal[s] = 0; came[s] = -1;
    push(hCost(sc, sr), s);
  }

  let goalState = -1;
  while (hf.length) {
    const s = pop();
    const node = s >> 2;
    if (node === goalNode) { goalState = s; break; }
    const dir = s & 3;
    const c = node % cols;
    const r = (node - c) / cols;
    const gs = gVal[s];
    for (let nd = 0; nd < 4; nd++) {
      const nc = c + DC[nd], nr = r + DR[nd];
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nn = nr * cols + nc;
      if (block[nn] > 0) continue;
      const ng =
        gs + GRID + (nd !== dir ? TURN_PEN : 0) +
        (usage[nn] > 0 ? CONGEST_PEN * usage[nn] : 0);
      const ns = nn * 4 + nd;
      if (gGen[ns] !== gen || ng < gVal[ns]) {
        gGen[ns] = gen; gVal[ns] = ng; came[ns] = s;
        push(ng + hCost(nc, nr), ns);
      }
    }
  }
  if (goalState < 0) return null;

  const path: { c: number; r: number }[] = [];
  let s = goalState;
  while (s >= 0) {
    const node = s >> 2;
    const c = node % cols;
    path.push({ c, r: (node - c) / cols });
    s = came[s];
  }
  path.reverse();
  return path;
}

/** Derékszögű tartalék-útvonal, ha az A* nem talál utat (ritka). */
function fallbackRoute(a: P, b: P, aSide?: Side, bSide?: Side): P[] {
  const ax = a.x + outDir(aSide) * STUB;
  const bx = b.x + outDir(bSide) * STUB;
  const mx = (ax + bx) / 2;
  return [a, { x: ax, y: a.y }, { x: mx, y: a.y }, { x: mx, y: b.y }, { x: bx, y: b.y }, b];
}

/** Útvonal-kulcs a memoizáláshoz (csak a routingot befolyásoló adatok). */
function routeKey(project: Project, ortho: boolean): string {
  let s = ortho ? "o" : "b";
  for (const i of project.instances)
    s += `|${i.id}:${Math.round(i.x)},${Math.round(i.y)}${i.mirror ? "m" : ""}:${i.defId}`;
  s += "#";
  for (const w of project.wires)
    s += `|${w.id}:${w.from.instanceId}.${w.from.pinId}>${w.to.instanceId}.${w.to.pinId}`;
  return s;
}

let memoKey = "";
let memoResult = new Map<string, string>();

/** Minden vezeték útvonala A* rács-tervezéssel: a vezetékek a komponens-dobozok
 *  KÖZÖTT, a szabad folyosókon futnak (soha nem a dobozok alatt). A párhuzamos
 *  vezetékek a congestion-költség miatt szétterülnek (nem fedik egymást). Az
 *  eredményt memoizáljuk, hogy pan/zoom alatt ne tervezzünk újra.
 *  Visszaad: vezeték-id → SVG path d. */
export function routeWires(project: Project, ortho: boolean): Map<string, string> {
  const key = routeKey(project, ortho);
  if (key === memoKey) return memoResult;

  const map = new Map<string, string>();
  const grid = buildGrid(project);
  const { cols, rows, ox, oy } = grid;
  const usage = new Float64Array(cols * rows);
  const wk: AStarWork = {
    gVal: new Float64Array(cols * rows * 4),
    gGen: new Int32Array(cols * rows * 4),
    came: new Int32Array(cols * rows * 4),
    gen: 0,
  };

  for (const w of project.wires) {
    const a = resolvePin(project, w.from);
    const b = resolvePin(project, w.to);
    if (!a || !b) continue;
    const pa = pinWorldPos(a.instance, a.def, a.pin.id)!;
    const pb = pinWorldPos(b.instance, b.def, b.pin.id)!;

    // A láb MERŐLEGES kilépő-csomópontjából tervezünk, ami a dobozon KÍVÜL van —
    // a saját komponens is AKADÁLY marad, ezért a vezeték a chip FÖLÖTT/ALATT
    // kerül, soha nem fut át alatta (a láb a saját oldalán lép ki).
    const start = pinNode(grid, pa.x, pa.y, outDir(a.pin.side));
    const goal = pinNode(grid, pb.x, pb.y, outDir(b.pin.side));

    wk.gen++;
    const cells =
      start && goal ? aStar(grid, usage, start.c, start.r, goal.c, goal.r, wk) : null;

    let pts: P[];
    if (cells && cells.length) {
      for (const n of cells) usage[n.r * cols + n.c] += 1;
      const wp = cells.map((n) => ({ x: ox + n.c * GRID, y: oy + n.r * GRID }));
      pts = [
        { x: pa.x, y: pa.y },
        { x: wp[0].x, y: pa.y },
        ...wp,
        { x: wp[wp.length - 1].x, y: pb.y },
        { x: pb.x, y: pb.y },
      ];
    } else {
      pts = fallbackRoute(pa, pb, a.pin.side, b.pin.side);
    }

    map.set(w.id, polyPath(pts, !ortho));
  }

  memoKey = key;
  memoResult = map;
  return map;
}
