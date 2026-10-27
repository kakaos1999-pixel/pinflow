// Alsó lenyíló panel: kapcsolati lista (netlista), alkatrészlista (BOM) és
// tervezési-szabály-ellenőrzés (DRC). CSV-export mindkét listához.

import { useMemo, useState } from "react";
import type { useEditor } from "../state/useEditor";
import {
  bomToCsv,
  buildBom,
  buildNetlist,
  netlistToCsv,
  runDrc,
} from "../lib/analysis";
import { downloadText, safeName } from "../lib/storage";

type Editor = ReturnType<typeof useEditor>;
type Tab = "net" | "bom" | "drc";

export function NetlistPanel({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { project } = editor;
  const [tab, setTab] = useState<Tab>("net");

  const net = useMemo(() => buildNetlist(project), [project]);
  const bom = useMemo(() => buildBom(project), [project]);
  const drc = useMemo(() => runDrc(project), [project]);

  const errors = drc.filter((i) => i.level === "error").length;
  const warns = drc.filter((i) => i.level === "warning").length;
  const base = safeName(project.name);

  return (
    <div className="netpanel">
      <div className="netpanel-head">
        <div className="netpanel-tabs">
          <button
            className={tab === "net" ? "ntab on" : "ntab"}
            onClick={() => setTab("net")}
          >
            Netlista <span className="nbadge">{net.length}</span>
          </button>
          <button
            className={tab === "bom" ? "ntab on" : "ntab"}
            onClick={() => setTab("bom")}
          >
            Alkatrészek <span className="nbadge">{bom.length}</span>
          </button>
          <button
            className={tab === "drc" ? "ntab on" : "ntab"}
            onClick={() => setTab("drc")}
          >
            Ellenőrzés{" "}
            <span className={errors ? "nbadge err" : warns ? "nbadge warn" : "nbadge"}>
              {drc.length}
            </span>
          </button>
        </div>
        <div className="netpanel-actions">
          {tab === "net" && (
            <button
              onClick={() => downloadText(netlistToCsv(net), `${base}-netlista.csv`, "text/csv")}
              disabled={net.length === 0}
            >
              CSV
            </button>
          )}
          {tab === "bom" && (
            <button
              onClick={() => downloadText(bomToCsv(bom), `${base}-alkatreszek.csv`, "text/csv")}
              disabled={bom.length === 0}
            >
              CSV
            </button>
          )}
          <button onClick={onClose} title="Bezárás">
            ✕
          </button>
        </div>
      </div>

      <div className="netpanel-body">
        {tab === "net" &&
          (net.length === 0 ? (
            <p className="netpanel-empty">Még nincs vezeték.</p>
          ) : (
            <table className="nettable">
              <thead>
                <tr>
                  <th>Honnan</th>
                  <th>Láb</th>
                  <th>Hova</th>
                  <th>Láb</th>
                  <th>Címke</th>
                </tr>
              </thead>
              <tbody>
                {net.map((r) => (
                  <tr
                    key={r.wireId}
                    onClick={() => editor.setSelection({ kind: "wire", id: r.wireId })}
                    className="net-row"
                  >
                    <td>{r.fromComp}</td>
                    <td>
                      <span className="pin-chip" style={{ background: r.color || undefined }} />
                      {r.fromPin}
                    </td>
                    <td>{r.toComp}</td>
                    <td>{r.toPin}</td>
                    <td className="muted">{r.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === "bom" &&
          (bom.length === 0 ? (
            <p className="netpanel-empty">Még nincs komponens.</p>
          ) : (
            <table className="nettable">
              <thead>
                <tr>
                  <th>Komponens</th>
                  <th>Kategória</th>
                  <th>Darab</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((r) => (
                  <tr key={r.defId}>
                    <td>{r.name}</td>
                    <td className="muted">{r.category}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === "drc" &&
          (drc.length === 0 ? (
            <p className="netpanel-empty">Nincs észlelt probléma. ✓</p>
          ) : (
            <ul className="drc-list">
              {drc.map((i, idx) => (
                <li key={idx} className={`drc-item ${i.level}`}>
                  <span className="drc-dot" />
                  {i.message}
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
