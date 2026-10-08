"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, CircleAlert, Download, FileText, FolderInput, History, Image as ImageIcon, Search, Send, X } from "lucide-react";
import { SECTIONS, type DocHistorique, type DocOralys, type DocsPatient, type Section, type TypeHisto } from "@/data/documents";

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ─────────────── Barre de gauche : retour + recherche + historique ─────────────── */

interface BarreProps {
  recherche: string;
  onRecherche: (v: string) => void;
  onBack: () => void;
  historique: boolean;
  onHistorique: () => void;
  migration?: DocsPatient["migration"];
}

export function DocsBarre({ recherche, onRecherche, onBack, historique, onHistorique, migration }: BarreProps) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-white py-1 shadow-[0_6px_16px_-8px_rgba(15,23,42,0.25)]">
        <button onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700" aria-label="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-slate-400">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
            placeholder={historique ? "Rechercher dans l'historique" : "Rechercher dans la fiche patient"}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
          />
          {recherche && (
            <button onClick={() => onRecherche("")} className="text-slate-400 hover:text-slate-700" aria-label="Effacer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onHistorique}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          historique ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${historique ? "bg-white/15" : "bg-violet-50 text-violet-600"}`}>
          <History className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">Historique</span>
          <span className={`block truncate text-[11px] ${historique ? "text-slate-300" : "text-slate-500"}`}>
            {migration ? `${migration.docs.length} documents importés de ${migration.source}` : "Aucun document migré"}
          </span>
        </span>
        {migration && (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${historique ? "bg-white/15 text-white" : "bg-violet-100 text-violet-700"}`}>
            {migration.source}
          </span>
        )}
      </button>
    </div>
  );
}

/* ─────────────── Vignette fichier, comme en prod ─────────────── */

function FileTile({ titre, date, badge, icon, sombre, onClick }: { titre: string; date: string; badge?: React.ReactNode; icon: React.ReactNode; sombre?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-[128px] flex-col items-center text-center">
      <span className="relative block h-[104px] w-[84px] transition-transform group-hover:-translate-y-0.5">
        <svg viewBox="0 0 84 104" className="absolute inset-0 h-full w-full drop-shadow-[0_1px_1px_rgba(15,23,42,0.06)]">
          <path d="M4,1 H62 L83,22 V99 Q83,103 79,103 H5 Q1,103 1,99 V5 Q1,1 5,1 Z" fill={sombre ? "#1f2937" : "#f3f4f6"} stroke={sombre ? "#111827" : "#d9dce1"} />
          <path d="M62,1 V18 Q62,22 66,22 H83" fill={sombre ? "#374151" : "#e5e7eb"} stroke={sombre ? "#111827" : "#d9dce1"} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">{icon}</span>
      </span>
      <span className="mt-2 line-clamp-2 text-[13px] leading-snug text-slate-800 group-hover:underline">{titre}</span>
      <span className="mt-0.5 text-[12px] text-slate-500">{date}</span>
      {badge && <span className="mt-1">{badge}</span>}
    </button>
  );
}

const STATUT_DOC = {
  "a-signer": { label: "À signer", cls: "border-red-200 bg-red-50 text-red-700", icon: <CircleAlert className="h-6 w-6 text-red-600" strokeWidth={1.8} /> },
  signe: { label: "Signé", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <Check className="h-6 w-6 text-emerald-600" strokeWidth={2} /> },
  envoye: { label: "Envoyé", cls: "border-sky-200 bg-sky-50 text-sky-700", icon: <Send className="h-5 w-5 text-sky-600" strokeWidth={1.8} /> },
};

function tileOralys(d: DocOralys) {
  const st = d.statut && STATUT_DOC[d.statut];
  return (
    <FileTile
      key={d.id}
      titre={d.titre}
      date={d.date}
      icon={st ? st.icon : <FileText className="h-6 w-6 text-slate-400" strokeWidth={1.5} />}
      badge={st && <span className={`rounded-md border px-1.5 py-0.5 text-[12px] ${st.cls}`}>{st.label}</span>}
    />
  );
}

/* ─────────────── Panneau Documents (prod) ─────────────── */

export function DocsOralys({ docs, recherche, onClose }: { docs: DocsPatient; recherche: string; onClose: () => void }) {
  const q = norm(recherche.trim());
  return (
    <div className="relative px-2 pt-6">
      <button onClick={onClose} className="absolute right-0 top-6 text-slate-500 hover:text-slate-900" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
      {SECTIONS.map((s, i) => {
        const items = docs.oralys[s.id].filter((d) => !q || norm(d.titre).includes(q));
        return (
          <section key={s.id} className={`pb-7 ${i > 0 ? "border-t border-slate-200 pt-6" : ""}`}>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
              {s.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-normal text-slate-500">{items.length}</span>
            </h3>
            {items.length === 0 ? (
              <p className="mt-3 text-[13px] text-slate-500">Aucun élément</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-5">{items.map(tileOralys)}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ─────────────── Panneau Historique (migration) ─────────────── */

const TYPES: TypeHisto[] = ["Radio", "Photo", "Compte rendu", "Courrier", "Ordonnance", "Devis", "Feuille de soins"];
const annee = (d: string) => d.slice(6);
const tri = (d: string) => d.slice(6) + d.slice(3, 5) + d.slice(0, 2);

function iconeHisto(d: DocHistorique) {
  if (d.format === "jpg") return <ImageIcon className="h-6 w-6 text-slate-300" strokeWidth={1.5} />;
  return <FileText className="h-6 w-6 text-slate-400" strokeWidth={1.5} />;
}

interface HistoProps {
  docs: DocsPatient;
  recherche: string;
  onClose: () => void;
  onClasser: (d: DocHistorique, section: Section) => void;
  classes: Set<string>;
}

export function DocsHistorique({ docs, recherche, onClose, onClasser, classes }: HistoProps) {
  const [type, setType] = useState<TypeHisto | "tous">("tous");
  const [apercu, setApercu] = useState<DocHistorique | null>(null);
  const m = docs.migration;
  const q = norm(recherche.trim());

  if (!m) {
    return (
      <div className="relative px-2 pt-6">
        <button onClick={onClose} className="absolute right-0 top-6 text-slate-500 hover:text-slate-900" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-[15px] font-semibold text-slate-800">Historique</h3>
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <History className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-[13px] text-slate-600">Aucun document migré pour ce patient.</p>
          <p className="mt-1 text-[12px] text-slate-400">Le patient a été créé directement dans Oralys.</p>
        </div>
      </div>
    );
  }

  const filtres = m.docs.filter((d) => (type === "tous" || d.type === type) && (!q || norm(d.titre + " " + d.type).includes(q)));
  const parAnnee = [...new Set(filtres.map((d) => annee(d.date)))].sort().reverse();
  const compte = (t: TypeHisto) => m.docs.filter((d) => d.type === t).length;

  return (
    <div className="relative px-2 pt-6">
      <button onClick={onClose} className="absolute right-0 top-6 text-slate-500 hover:text-slate-900" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
        Historique
        <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-normal text-slate-500">{m.docs.length}</span>
        <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">{m.source}</span>
      </h3>
      <p className="mt-1 text-[12px] text-slate-500">
        Documents repris de {m.source} lors de la migration du {m.importeLe}. Ils sont en lecture seule, vous pouvez les classer dans le dossier Oralys.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(["tous", ...TYPES.filter((t) => compte(t) > 0)] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
              type === t ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {t === "tous" ? "Tous" : t} <span className="opacity-60">{t === "tous" ? m.docs.length : compte(t)}</span>
          </button>
        ))}
      </div>

      {parAnnee.length === 0 && <p className="mt-8 text-[13px] text-slate-500">Aucun document ne correspond.</p>}
      {parAnnee.map((a) => (
        <section key={a} className="mt-6 border-t border-slate-200 pt-5">
          <h4 className="text-[13px] font-semibold text-slate-500">{a}</h4>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-5">
            {filtres
              .filter((d) => annee(d.date) === a)
              .sort((x, y) => tri(y.date).localeCompare(tri(x.date)))
              .map((d) => (
                <FileTile
                  key={d.id}
                  titre={d.titre}
                  date={d.date}
                  sombre={d.type === "Radio"}
                  icon={iconeHisto(d)}
                  onClick={() => setApercu(d)}
                  badge={
                    <span className="flex items-center gap-1">
                      <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{d.type}</span>
                      {classes.has(d.id) && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </span>
                  }
                />
              ))}
          </div>
        </section>
      ))}

      {apercu && <Apercu doc={apercu} source={m.source} importeLe={m.importeLe} classe={classes.has(apercu.id)} onClose={() => setApercu(null)} onClasser={onClasser} />}
    </div>
  );
}

const SECTION_PAR_TYPE: Record<TypeHisto, Section> = {
  Radio: "documents",
  Photo: "documents",
  "Compte rendu": "documents",
  Courrier: "documents",
  Ordonnance: "ordonnances",
  Devis: "devis",
  "Feuille de soins": "factures",
};

function Apercu({ doc, source, importeLe, classe, onClose, onClasser }: { doc: DocHistorique; source: string; importeLe: string; classe: boolean; onClose: () => void; onClasser: HistoProps["onClasser"] }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const section = SECTION_PAR_TYPE[doc.type];
  const sectionLabel = SECTIONS.find((s) => s.id === section)!.label;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-8" onClick={onClose}>
      <div className="flex h-[min(640px,90vh)] w-[min(980px,95vw)] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-1 items-center justify-center bg-slate-100 p-6">
          {doc.format === "jpg" ? (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#0d1117]">
              <svg viewBox="0 0 400 200" className="w-[85%] opacity-90" aria-hidden>
                <defs>
                  <radialGradient id="rx" cx="50%" cy="50%" r="60%">
                    <stop offset="0" stopColor="#4b5563" />
                    <stop offset="1" stopColor="#0d1117" />
                  </radialGradient>
                </defs>
                <ellipse cx="200" cy="100" rx="190" ry="90" fill="url(#rx)" />
                {Array.from({ length: 14 }, (_, i) => (
                  <rect key={`h${i}`} x={60 + i * 20} y={52 + Math.abs(i - 6.5) * 2} width="15" height="42" rx="6" fill="#d1d5db" opacity={0.75} />
                ))}
                {Array.from({ length: 14 }, (_, i) => (
                  <rect key={`b${i}`} x={60 + i * 20} y={104 - Math.abs(i - 6.5) * 2} width="15" height="40" rx="6" fill="#d1d5db" opacity={0.7} />
                ))}
              </svg>
            </div>
          ) : (
            <div className="h-full w-[440px] overflow-hidden rounded-sm bg-white px-10 py-9 shadow-md">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800">Cabinet dentaire</div>
                  <div className="text-[10px] text-slate-400">Export {source}</div>
                </div>
                <div className="text-[10px] text-slate-400">{doc.date}</div>
              </div>
              <div className={`mt-5 text-[13px] font-semibold text-slate-800 ${doc.format === "txt" ? "font-mono" : ""}`}>{doc.titre}</div>
              <p className={`mt-3 text-[12px] leading-relaxed text-slate-700 ${doc.format === "txt" ? "font-mono" : ""}`}>{doc.extrait ?? "Contenu du document repris tel quel depuis l'ancien logiciel."}</p>
              <div className="mt-5 space-y-2">
                {[92, 80, 86, 60].map((w, i) => (
                  <div key={i} className="h-2 rounded bg-slate-100" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">{source}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="mt-3 text-[16px] font-semibold text-slate-900">{doc.titre}</h3>
          <dl className="mt-4 space-y-2 text-[13px]">
            {[
              ["Type", doc.type],
              ["Date du document", doc.date],
              ["Format", `${doc.format.toUpperCase()} · ${doc.taille}`],
              ["Importé le", importeLe],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto space-y-2">
            <button
              onClick={() => onClasser(doc, section)}
              disabled={classe}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${
                classe ? "bg-emerald-50 text-emerald-700" : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              {classe ? <Check className="h-4 w-4" /> : <FolderInput className="h-4 w-4" />}
              {classe ? `Classé dans ${sectionLabel}` : `Classer dans ${sectionLabel}`}
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Télécharger
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
