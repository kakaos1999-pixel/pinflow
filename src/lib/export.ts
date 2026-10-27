// Kép-export: a projektből független, tiszta SVG-t építünk (UI-krom nélkül),
// és abból készül az SVG letöltés, illetve a PNG raszterizálás.

import type { Project } from "../types";
import { getDef } from "../data/components";
import {
  busColor,
  contentBounds,
  midPoint,
  obstacleRects,
  placedPins,
  pinWorldPos,
  resolvePin,
  routeWires,
} from "./geometry";
import { downloadBlob, safeName } from "./storage";

const PAD = 60;
const PIN_R = 5;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Az exportált kép teljes mérete (tartalom + margó). */
function svgSize(project: Project): { vw: number; vh: number } {
  const b = contentBounds(project);
  return { vw: b.width + PAD * 2, vh: b.height + PAD * 2 };
}

/** Teljes, önálló SVG markup a projektből. */
export function buildSvg(project: Project, ortho = false): string {
  const b = contentBounds(project);
  const vw = b.width + PAD * 2;
  const vh = b.height + PAD * 2;
  const ox = PAD - b.x;
  const oy = PAD - b.y;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}" font-family="ui-sans-serif, system-ui, sans-serif">`,
  );
  parts.push(`<rect width="${vw}" height="${vh}" fill="#f8fafc"/>`);
  parts.push(`<g transform="translate(${ox} ${oy})">`);

  const obstacles = obstacleRects(project);
  const wirePaths = routeWires(project, obstacles, ortho);

  // Vezetékek (a komponensek alá).
  for (const w of project.wires) {
    const a = resolvePin(project, w.from);
    const c = resolvePin(project, w.to);
    if (!a || !c) continue;
    const pa = pinWorldPos(a.instance, a.def, a.pin.id)!;
    const pc = pinWorldPos(c.instance, c.def, c.pin.id)!;
    const color = w.color ?? busColor(a.pin.bus);
    parts.push(
      `<path d="${wirePaths.get(w.id) ?? ""}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`,
    );
    if (w.label) {
      const m = midPoint(pa, pc);
      const halfW = w.label.length * 3.2 + 5;
      parts.push(
        `<rect x="${m.x - halfW}" y="${m.y - 9}" width="${halfW * 2}" height="16" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>`,
      );
      parts.push(
        `<text x="${m.x}" y="${m.y + 2.5}" text-anchor="middle" font-size="10" font-weight="600" fill="#0f172a">${esc(w.label)}</text>`,
      );
    }
  }

  // Komponensek.
  for (const inst of project.instances) {
    const def = getDef(inst.defId);
    if (!def) continue;
    parts.push(`<g transform="translate(${inst.x} ${inst.y})">`);
    parts.push(
      `<rect width="${def.width}" height="${def.height}" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`,
    );
    parts.push(
      `<rect width="${def.width}" height="26" rx="10" fill="${def.color ?? "#334155"}"/>`,
    );
    parts.push(`<rect y="16" width="${def.width}" height="10" fill="${def.color ?? "#334155"}"/>`);
    parts.push(
      `<text x="${def.width / 2}" y="18" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="600">${esc(inst.label || def.name)}</text>`,
    );

    for (const pin of placedPins(def, inst)) {
      const left = pin.side === "left";
      const lx = left ? pin.x + PIN_R + 5 : pin.x - PIN_R - 5;
      const anchor = left ? "start" : "end";
      const color = busColor(pin.bus);
      parts.push(
        `<circle cx="${pin.x}" cy="${pin.y}" r="${PIN_R}" fill="${color}" stroke="#0f172a" stroke-width="1"/>`,
      );
      parts.push(
        `<text x="${lx}" y="${pin.y - 1}" text-anchor="${anchor}" font-size="10" font-weight="600" fill="#0f172a">${esc(pin.name)}</text>`,
      );
      if (pin.sub) {
        parts.push(
          `<text x="${lx}" y="${pin.y + 9}" text-anchor="${anchor}" font-size="7.5" fill="#64748b">${esc(pin.sub)}</text>`,
        );
      }
    }
    parts.push(`</g>`);
  }

  // Jegyzetek (a komponensek fölött).
  for (const note of project.notes) {
    const lines = (note.text || " ").split("\n");
    const color = note.color ?? "#92400e";
    const maxLen = Math.max(1, ...lines.map((l) => l.length));
    const w = Math.min(360, Math.max(60, maxLen * 6.6 + 16));
    const h = lines.length * 16 + 16;
    parts.push(`<g transform="translate(${note.x} ${note.y})">`);
    parts.push(
      `<rect width="${w}" height="${h}" rx="6" fill="#fef9c3" stroke="#fde047" stroke-width="1"/>`,
    );
    lines.forEach((l, i) => {
      parts.push(
        `<text x="8" y="${20 + i * 16}" font-size="12" fill="${color}">${esc(l)}</text>`,
      );
    });
    parts.push(`</g>`);
  }

  parts.push(`</g></svg>`);
  return parts.join("");
}

export function exportSvg(project: Project, ortho = false): void {
  const svg = buildSvg(project, ortho);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${safeName(project.name)}.svg`);
}

/** PNG export: az SVG-t vászonra rajzoljuk 2× felbontással. */
export function exportPng(project: Project, ortho = false, scale = 2): Promise<void> {
  return new Promise((resolve, reject) => {
    const svg = buildSvg(project, ortho);
    const { vw, vh } = svgSize(project);

    const url =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("nincs 2D kontextus"));
        return;
      }
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("PNG konverzió sikertelen"));
          return;
        }
        downloadBlob(blob, `${safeName(project.name)}.png`);
        resolve();
      }, "image/png");
    };
    img.onerror = () => reject(new Error("SVG betöltés sikertelen"));
    img.src = url;
  });
}

/**
 * Vektoros PDF export: a buildSvg() SVG-jét valódi DOM-elembe parse-oljuk,
 * majd a svg2pdf.js vektorosan a jsPDF lapra rajzolja (nem raszter). A nehéz
 * könyvtárakat dinamikusan töltjük, hogy ne hízlalják az alap bundle-t.
 */
export async function exportPdf(project: Project, ortho = false): Promise<void> {
  const [{ jsPDF }, svg2pdfMod] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);
  const svg2pdf = svg2pdfMod.svg2pdf;

  const { vw, vh } = svgSize(project);
  // Rejtett konténer: a svg2pdf-nek a DOM-ban lévő elemre van szüksége a
  // szöveg- és elrendezés-méretekhez.
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-99999px;top:0;";
  holder.innerHTML = buildSvg(project, ortho);
  const svgEl = holder.firstElementChild as SVGSVGElement;
  document.body.appendChild(holder);

  try {
    const doc = new jsPDF({
      orientation: vw >= vh ? "landscape" : "portrait",
      unit: "pt",
      format: [vw, vh],
    });
    await svg2pdf(svgEl, doc, { x: 0, y: 0, width: vw, height: vh });
    doc.save(`${safeName(project.name)}.pdf`);
  } finally {
    holder.remove();
  }
}
