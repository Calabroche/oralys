"use client";

import { useState } from "react";
import { ARCADE_INF, ARCADE_SUP } from "@/lib/dents";
import type { EtatDent, Rdv } from "@/data/dossierPatient";
import { TYPES_RDV } from "@/data/dossierPatient";
import { formatDateCourte } from "@/components/patients/format";

/* ────────────────────────────────────────────────────────────────────────────
 * Dessin des dents, calqué sur le schéma de prod.
 * Chaque dent est dessinée « couronne en bas » (comme une dent du haut, côté
 * droit du patient = gauche de l'écran). Les dents du bas sont retournées
 * verticalement, celles des quadrants 2 et 3 en miroir horizontal.
 * ──────────────────────────────────────────────────────────────────────────── */

const H = 112;

/** Largeur de colonne (dent + case numéro) selon la position 1 à 8. */
const WIDTH: Record<number, number> = { 1: 39, 2: 31, 3: 39, 4: 35, 5: 35, 6: 56, 7: 50, 8: 51 };

interface Shape {
  roots: string;
  /** Traits internes des racines (séparations, canaux). */
  lines?: string[];
  crown: string;
}

// Petit utilitaire : les coordonnées x sont en fraction de la largeur, les y en pixels.
function path(w: number, cmds: (string | number)[]) {
  let xTurn = true;
  return cmds
    .map((c) => {
      if (typeof c === "string") {
        xTurn = true;
        return c;
      }
      const out = xTurn ? (c * w).toFixed(1) : c.toFixed(1);
      xTurn = !xTurn;
      return out;
    })
    .join(" ");
}

function molarCrown(w: number, top: number) {
  return path(w, [
    "M", 0.03, top + 20,
    "C", -0.01, top + 6, 0.14, top - 1, 0.3, top + 2,
    "C", 0.42, top - 1, 0.58, top - 1, 0.7, top + 3,
    "C", 0.86, top - 1, 1.01, top + 6, 0.97, top + 20,
    "C", 1.01, top + 34, 0.86, top + 42, 0.72, top + 38,
    "C", 0.62, top + 43, 0.55, top + 36, 0.5, top + 37,
    "C", 0.45, top + 36, 0.38, top + 43, 0.28, top + 38,
    "C", 0.14, top + 42, -0.01, top + 34, 0.03, top + 20,
    "Z",
  ]);
}

interface Tip {
  x: number;
  y: number;
  /** Rayon de l'arrondi de la pointe, en fraction de la largeur. */
  r: number;
}

/**
 * Contour des racines : on part de la base gauche, on monte jusqu'à chaque pointe (arrondie),
 * on redescend dans la furcation, et on finit à la base droite. Tangentes verticales partout
 * pour des racines bien galbées, comme sur le schéma de prod.
 */
function rootOutline(w: number, base: number, x0: number, x1: number, tips: Tip[], notches: { x: number; y: number }[]) {
  const pts: { x: number; y: number; arc?: number }[] = [{ x: x0 * w, y: base }];
  tips.forEach((t, i) => {
    pts.push({ x: (t.x - t.r) * w, y: t.y + t.r * w });
    pts.push({ x: (t.x + t.r) * w, y: t.y + t.r * w, arc: t.r * w });
    if (notches[i]) pts.push({ x: notches[i].x * w, y: notches[i].y });
  });
  pts.push({ x: x1 * w, y: base });
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (b.arc) {
      d += ` A${b.arc.toFixed(1)},${(b.arc * 1.1).toFixed(1)} 0 0 1 ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    } else {
      const my = (a.y + b.y) / 2;
      d += ` C${a.x.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }
  }
  return d + " Z";
}

function upperShape(pos: number, w: number): Shape {
  if (pos >= 6) {
    const top = 68;
    const base = top + 10;
    if (pos === 8) {
      return {
        roots: rootOutline(w, base, 0.12, 0.88, [{ x: 0.36, y: 18, r: 0.16 }], []),
        lines: [path(w, ["M", 0.3, 26, "C", 0.36, 40, 0.5, 50, 0.6, 56])],
        crown: molarCrown(w, top),
      };
    }
    if (pos === 7) {
      return {
        roots: rootOutline(w, base, 0.1, 0.9, [{ x: 0.18, y: 14, r: 0.1 }, { x: 0.72, y: 10, r: 0.1 }], [{ x: 0.46, y: 40 }]),
        lines: [path(w, ["M", 0.66, 18, "C", 0.6, 34, 0.56, 50, 0.6, 60])],
        crown: molarCrown(w, top),
      };
    }
    return {
      roots: rootOutline(
        w,
        base,
        0.08,
        0.92,
        [{ x: 0.14, y: 16, r: 0.075 }, { x: 0.5, y: 8, r: 0.08 }, { x: 0.85, y: 14, r: 0.075 }],
        [{ x: 0.32, y: 42 }, { x: 0.67, y: 44 }]
      ),
      crown: molarCrown(w, top),
    };
  }
  if (pos >= 4) {
    const top = 64;
    return {
      roots:
        pos === 4
          ? rootOutline(w, top + 8, 0.2, 0.8, [{ x: 0.38, y: 12, r: 0.1 }, { x: 0.62, y: 10, r: 0.1 }], [{ x: 0.5, y: 30 }])
          : rootOutline(w, top + 8, 0.22, 0.78, [{ x: 0.5, y: 8, r: 0.14 }], []),
      crown: path(w, ["M", 0.08, top + 18, "C", 0.06, top + 4, 0.28, top - 2, 0.5, top - 2, "C", 0.72, top - 2, 0.94, top + 4, 0.92, top + 18, "C", 0.92, top + 30, 0.66, top + 40, 0.5, top + 42, "C", 0.34, top + 40, 0.08, top + 30, 0.08, top + 18, "Z"]),
    };
  }
  if (pos === 3) {
    const top = 58;
    return {
      roots: rootOutline(w, top + 10, 0.2, 0.8, [{ x: 0.52, y: 0, r: 0.12 }], []),
      crown: path(w, ["M", 0.06, top + 24, "C", 0.06, top + 8, 0.28, top, 0.52, top, "C", 0.76, top, 0.94, top + 10, 0.94, top + 24, "C", 0.94, top + 36, 0.7, top + 46, 0.48, top + 48, "C", 0.26, top + 46, 0.06, top + 36, 0.06, top + 24, "Z"]),
    };
  }
  const top = pos === 1 ? 60 : 64;
  return {
    roots: pos === 1 ? rootOutline(w, top + 10, 0.16, 0.84, [{ x: 0.44, y: 6, r: 0.13 }], []) : rootOutline(w, top + 10, 0.2, 0.8, [{ x: 0.46, y: 18, r: 0.13 }], []),
    crown: path(w, ["M", 0.06, top + 44, "C", 0.0, top + 26, 0.06, top + 2, 0.5, top, "C", 0.94, top + 2, 1.0, top + 26, 0.94, top + 44, "C", 0.7, top + 47, 0.3, top + 47, 0.06, top + 44, "Z"]),
  };
}

function lowerShape(pos: number, w: number): Shape {
  // Coordonnées « couronne en bas », retournées ensuite.
  if (pos >= 6) {
    const top = 70;
    if (pos === 8) {
      return {
        roots: rootOutline(w, top + 10, 0.12, 0.88, [{ x: 0.3, y: 12, r: 0.13 }], []),
        lines: [path(w, ["M", 0.3, 22, "C", 0.36, 36, 0.48, 48, 0.58, 54])],
        crown: molarCrown(w, top),
      };
    }
    return {
      roots: rootOutline(w, top + 10, 0.1, 0.9, [{ x: 0.17, y: 8, r: 0.1 }, { x: 0.8, y: 10, r: 0.1 }], [{ x: 0.5, y: 44 }]),
      crown: molarCrown(w, top),
    };
  }
  if (pos >= 4) {
    const top = 66;
    return {
      roots: rootOutline(w, top + 8, 0.22, 0.78, [{ x: 0.46, y: 2, r: 0.13 }], []),
      crown: path(w, ["M", 0.06, top + 22, "C", 0.04, top + 6, 0.26, top - 2, 0.5, top - 2, "C", 0.74, top - 2, 0.96, top + 6, 0.94, top + 22, "C", 0.94, top + 36, 0.72, top + 44, 0.5, top + 44, "C", 0.28, top + 44, 0.06, top + 36, 0.06, top + 22, "Z"]),
    };
  }
  if (pos === 3) {
    const top = 64;
    return {
      roots: rootOutline(w, top + 8, 0.22, 0.78, [{ x: 0.46, y: 0, r: 0.12 }], []),
      crown: path(w, ["M", 0.1, top + 18, "C", 0.08, top + 4, 0.3, top - 2, 0.5, top - 2, "C", 0.72, top - 2, 0.92, top + 6, 0.9, top + 22, "C", 0.9, top + 36, 0.72, top + 46, 0.5, top + 46, "C", 0.28, top + 46, 0.1, top + 34, 0.1, top + 18, "Z"]),
    };
  }
  const top = 66;
  return {
    roots: rootOutline(w, top + 8, 0.28, 0.72, [{ x: 0.5, y: 4, r: 0.1 }], []),
    crown: path(w, ["M", 0.3, top, "C", 0.18, top + 10, 0.12, top + 26, 0.14, top + 36, "C", 0.16, top + 46, 0.84, top + 46, 0.86, top + 36, "C", 0.88, top + 26, 0.82, top + 10, 0.7, top, "C", 0.6, top - 3, 0.4, top - 3, 0.3, top, "Z"]),
  };
}

const COLORS = {
  sain: { fill: "#f6f7f9", stroke: "#9aa2ad" },
  soigne: { fill: "#c3dcf0", stroke: "#3d7fb5" },
  prevu: { fill: "#f7c3d5", stroke: "#d0456f" },
  focus: { fill: "#ffffff", stroke: "#111827" },
  selection: { fill: "#8ec5ec", stroke: "#1468a8" },
};

function Tooth({ n, etat, lower, active, selected }: { n: number; etat?: EtatDent; lower: boolean; active: boolean; selected: boolean }) {
  const pos = n % 10;
  const w = WIDTH[pos];
  const mirror = Math.floor(n / 10) === 2 || Math.floor(n / 10) === 3;

  if (etat === "absent" || etat === "extrait") {
    const y = lower ? 22 : H - 22;
    const color = selected ? COLORS.selection.stroke : etat === "extrait" ? "#a8234a" : "#3d7fb5";
    return (
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block">
        <path d={`M4,${y} q${(w - 8) / 4},-3 ${(w - 8) / 2},0 t${(w - 8) / 2},0`} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      </svg>
    );
  }

  const shape = lower ? lowerShape(pos, w) : upperShape(pos, w);
  const c = selected ? COLORS.selection : active ? COLORS.focus : COLORS[etat ?? "sain"];
  const sw = active || selected ? 1.5 : 1.1;
  const transforms = [lower ? `translate(0,${H}) scale(1,-1)` : "", mirror ? `translate(${w},0) scale(-1,1)` : ""].join(" ").trim();

  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block overflow-visible">
      <g transform={transforms || undefined} strokeLinejoin="round" strokeLinecap="round">
        <path d={shape.roots} fill={c.fill} stroke={c.stroke} strokeWidth={sw} />
        {shape.lines?.map((d, i) => <path key={i} d={d} fill="none" stroke={c.stroke} strokeWidth={sw * 0.9} />)}
        {etat === "prevu" && !selected && !active && (
          // Implant prévu : spires sur la racine, comme en prod.
          <g stroke={c.stroke} strokeWidth={1.2}>
            {[22, 29, 36, 43, 50, 57].map((y) => (
              <line key={y} x1={w * 0.3} x2={w * 0.7} y1={y} y2={y - 2} />
            ))}
          </g>
        )}
        <path d={shape.crown} fill={c.fill} stroke={c.stroke} strokeWidth={sw} />
      </g>
    </svg>
  );
}

/** Bandeau de gencive (haut ou bas) derrière le schéma. */
function Gum({ bottom }: { bottom?: boolean }) {
  return (
    <svg
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 h-[70px] w-full ${bottom ? "bottom-0 -scale-y-100" : "top-0"}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={bottom ? "gum-b" : "gum-t"} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef0f3" />
        </linearGradient>
      </defs>
      <path
        d="M0,92 C40,40 220,14 500,10 C780,14 960,40 1000,92 C930,70 760,44 560,58 C530,61 470,61 440,58 C240,44 70,70 0,92 Z"
        fill={`url(#${bottom ? "gum-b" : "gum-t"})`}
      />
      <path d="M0,92 C70,70 240,44 440,58 C470,61 530,61 560,58 C760,44 930,70 1000,92" fill="none" stroke="#c9cdd3" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface Props {
  etatDents: Record<number, EtatDent>;
  /** Dents du RDV survolé ou sélectionné. */
  highlighted: Set<number>;
  caviteHighlighted: boolean;
  editing: boolean;
  selection: Set<number>;
  caviteSelected: boolean;
  rdvsParDent: Map<number, Rdv[]>;
  onToggleTooth: (n: number) => void;
  onToggleCavite: () => void;
  onOpenRdv: (id: string) => void;
}

export function Odontogramme({
  etatDents,
  highlighted,
  caviteHighlighted,
  editing,
  selection,
  caviteSelected,
  rdvsParDent,
  onToggleTooth,
  onToggleCavite,
  onOpenRdv,
}: Props) {
  const [popover, setPopover] = useState<number | null>(null);

  const numberBox = (n: number) => {
    const etat = etatDents[n];
    const active = highlighted.has(n);
    const selected = editing && selection.has(n);
    const cls = selected
      ? "border-sky-700 bg-sky-600 text-white"
      : active
        ? "border-slate-600 bg-slate-600 text-white"
        : etat === "soigne"
          ? "border-[#3d7fb5] text-[#3d7fb5] bg-white"
          : etat === "prevu"
            ? "border-[#d0456f] text-[#d0456f] bg-white"
            : etat === "extrait"
              ? "border-dashed border-[#d0456f] text-[#a8234a] bg-white"
              : etat === "absent"
                ? "border-dashed border-[#3d7fb5] text-[#3d7fb5] bg-white"
                : "border-slate-400/70 text-slate-500 bg-white";
    return (
      <span
        className={`flex h-[31px] items-center justify-center rounded-lg border text-[15px] font-light tabular-nums transition-colors ${cls}`}
        style={{ width: WIDTH[n % 10] }}
      >
        {n}
      </span>
    );
  };

  const toothButton = (n: number, lower: boolean, withBox: "before" | "after") => {
    const etat = etatDents[n];
    const active = highlighted.has(n);
    const selected = editing && selection.has(n);
    const rdvs = rdvsParDent.get(n) ?? [];
    const click = () => (editing ? onToggleTooth(n) : setPopover(popover === n ? null : n));
    return (
      <div key={n} className="relative">
        <button
          type="button"
          onClick={click}
          aria-label={`Dent ${n}`}
          className={`group flex flex-col items-center outline-none ${editing ? "cursor-copy" : "cursor-pointer"}`}
        >
          {withBox === "before" && <span className="mb-[9px]">{numberBox(n)}</span>}
          <span className={`transition-transform duration-150 ${editing ? "group-hover:-translate-y-0.5" : ""} group-hover:[filter:brightness(0.97)]`}>
            <Tooth n={n} etat={etat} lower={lower} active={active} selected={selected} />
          </span>
          {withBox === "after" && <span className="mt-[9px]">{numberBox(n)}</span>}
        </button>
        {popover === n && !editing && (
          <>
            <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setPopover(null)} />
            <div className={`absolute left-1/2 z-50 w-72 -translate-x-1/2 rounded-xl bg-slate-900 p-3 text-left text-white shadow-xl ${lower ? "bottom-full mb-2" : "top-full mt-2"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Dent {n} <span className="font-normal text-slate-400">({rdvs.length} RDV)</span>
                </span>
                <button onClick={() => setPopover(null)} className="text-slate-400 hover:text-white" aria-label="Fermer">
                  ×
                </button>
              </div>
              {rdvs.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun rendez-vous ne concerne cette dent.</p>
              ) : (
                <ul className="space-y-1">
                  {rdvs.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => {
                          onOpenRdv(r.id);
                          setPopover(null);
                        }}
                        className="w-full rounded-md px-2 py-1.5 text-left hover:bg-white/10"
                      >
                        <div className="text-[11px] text-slate-400">{r.date ? formatDateCourte(r.date) : "À planifier"}</div>
                        <div className="text-[13px]">
                          <span className="font-medium">{TYPES_RDV[r.type].label}</span>
                          {r.motif && <span className="text-slate-300"> · {r.motif}</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Une arcade = quadrant droit, croix centrale, quadrant gauche.
  const arcade = (teeth: number[], lower: boolean) => (
    <div className={`flex gap-2 ${lower ? "items-start" : "items-end"}`}>
      <div className="flex gap-2">{teeth.slice(0, 8).map((n) => toothButton(n, lower, lower ? "before" : "after"))}</div>
      <div className="w-[14px]" />
      <div className="flex gap-2">{teeth.slice(8).map((n) => toothButton(n, lower, lower ? "before" : "after"))}</div>
    </div>
  );

  return (
    <div className={`relative w-fit rounded-[36px] px-6 pb-14 pt-10 transition-shadow ${editing ? "bg-sky-50/50 ring-2 ring-sky-300" : ""}`}>
      <Gum />
      <Gum bottom />
      <div className="relative flex flex-col items-center gap-2">
        {arcade(ARCADE_SUP, false)}
        {arcade(ARCADE_INF, true)}
        {/* Croix centrale entre 11/21 et 41/31 */}
        <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" width="18" height="18" aria-hidden>
          <path d="M9,0 V18 M0,9 H18" stroke="#4b5563" strokeWidth={1} />
        </svg>
      </div>
      <button
        type="button"
        onClick={editing ? onToggleCavite : undefined}
        className={`absolute bottom-3 left-8 rounded-full border px-4 py-1 text-[14px] transition-colors ${
          (editing && caviteSelected) || (!editing && caviteHighlighted)
            ? "border-slate-600 bg-slate-600 text-white"
            : "border-[#3d7fb5] bg-white text-[#3d7fb5] hover:bg-sky-50"
        }`}
      >
        Cavité buccale
      </button>
    </div>
  );
}
