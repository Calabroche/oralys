"use client";

import { useEffect, useState } from "react";
import {
  AtSign,
  CalendarDays,
  CalendarClock,
  Check,
  ChevronUp,
  ClipboardList,
  CircleAlert,
  Crosshair,
  Euro,
  ExternalLink,
  History,
  ImagePlus,
  Menu,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  FolderOpen,
  SquarePlus,
  User,
  Workflow,
} from "lucide-react";
import { TYPES_RDV, type ItemChecklist, type NotePrivee, type Rdv } from "@/data/dossierPatient";
import { allRdvs, useDossiers } from "@/context/DossiersContext";
import { NotesEpinglees, NotesModalActuelle, NotesPopover, ToastEnregistre } from "@/components/patients/NotesPrivees";
import { ARCADE_INF, ARCADE_SUP, QUADRANTS, SEXTANTS } from "@/lib/dents";
import { Odontogramme } from "@/components/patients/Odontogramme";
import { IconeIA, ResumeIAPopover } from "@/components/patients/ResumeIA";
import { RdvCard } from "@/components/patients/RdvCard";
import { Checklist } from "@/components/patients/Checklist";
import { DocsBarre, DocsHistorique, DocsOralys } from "@/components/patients/DocumentsPatient";
import { DOCUMENTS, type DocHistorique, type Section } from "@/data/documents";
import { formatDateCourte, formatDateLongue, formatEuros } from "@/components/patients/format";

export default function PatientsPage() {
  const { patients, setPatients, patientId, rdvId: selectedId, setRdvId: setSelectedId, ouvrir, updateRdv: updateRdvCtx } = useDossiers();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [avecDents, setAvecDents] = useState(true);
  const [docsMode, setDocsMode] = useState<null | "docs" | "historique">(null);
  const [recherche, setRecherche] = useState("");
  const [docs, setDocs] = useState(() => structuredClone(DOCUMENTS));
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [notesDiscretes, setNotesDiscretes] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [iaOpen, setIaOpen] = useState(false);
  const [notesMasquees, setNotesMasquees] = useState(false);
  const [toastCount, setToastCount] = useState(0);
  const [devisOpen, setDevisOpen] = useState(true);
  const [saveCount, setSaveCount] = useState(0);

  const patient = patients.find((p) => p.id === patientId)!;
  const rdvs = allRdvs(patient);
  const selected = rdvs.find((r) => r.id === selectedId) ?? rdvs[0];
  const hovered = rdvs.find((r) => r.id === hoveredId);
  const focus = editing ? selected : (hovered ?? selected);

  const rdvsParDent = new Map<number, Rdv[]>();
  for (const r of rdvs) for (const d of r.zone.dents) rdvsParDent.set(d, [...(rdvsParDent.get(d) ?? []), r]);

  const updateRdv = (id: string, fn: (r: Rdv) => Rdv) => {
    updateRdvCtx(patientId, id, fn);
    setSaveCount((c) => c + 1);
  };

  const setNotes = (notes: NotePrivee[]) => setPatients((ps) => ps.map((p) => (p.id === patientId ? { ...p, notes } : p)));
  const notesProps = {
    notes: patient.notes,
    onChange: setNotes,
    onSaved: () => setToastCount((c) => c + 1),
    onClose: () => setNotesOpen(false),
  };

  const docsPatient = docs[patientId];
  const classesPatient = new Set([...classes].filter((k) => k.startsWith(patientId + ":")).map((k) => k.slice(patientId.length + 1)));
  const fermerDocs = () => {
    setDocsMode(null);
    setRecherche("");
  };
  // Un document migré est copié dans la bonne section du dossier Oralys.
  const classer = (d: DocHistorique, section: Section) => {
    setDocs((all) => {
      const cur = all[patientId];
      const copie = { id: `migr-${d.id}`, titre: d.titre, date: d.date };
      return { ...all, [patientId]: { ...cur, oralys: { ...cur.oralys, [section]: [copie, ...cur.oralys[section]] } } };
    });
    setClasses((c) => new Set(c).add(`${patientId}:${d.id}`));
    setToastCount((c) => c + 1);
  };

  const setZoneDents = (fn: (s: Set<number>) => void) =>
    updateRdv(selected.id, (r) => {
      const s = new Set(r.zone.dents);
      fn(s);
      return { ...r, zone: { ...r.zone, dents: [...s] } };
    });

  const toggleGroupe = (dents: number[]) =>
    setZoneDents((s) => {
      const all = dents.every((d) => s.has(d));
      dents.forEach((d) => (all ? s.delete(d) : s.add(d)));
    });

  const selectRdv = (id: string) => {
    setSelectedId(id);
    setEditing(false);
    setSaveCount(0);
  };

  const switchPatient = (id: string) => {
    ouvrir(id);
    setEditing(false);
    setSaveCount(0);
    setRecherche("");
    setNotesOpen(false);
    setIaOpen(false);
  };

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const card = (r: Rdv) => (
    <RdvCard
      key={r.id}
      rdv={r}
      avecDents={avecDents}
      selected={r.id === selected.id}
      onSelect={() => selectRdv(r.id)}
      onHover={(h) => setHoveredId(h ? r.id : null)}
    />
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-white">
      {/* ───────── Colonne patient ───────── */}
      <aside className="w-[400px] shrink-0 px-8 pt-6">
        <div className="flex items-start justify-between">
          <h1 className="text-xl text-slate-900">
            {patient.prenom} <span className="font-semibold">{patient.nom}</span>
          </h1>
          <div className="relative flex rounded-lg border border-slate-200 text-slate-600">
            <button
              onClick={() => setIaOpen((v) => !v)}
              className={`flex h-8 w-8 items-center justify-center hover:bg-slate-50 ${iaOpen ? "bg-violet-50" : ""}`}
              aria-label="Résumé IA du patient"
              title="Résumé IA du patient"
            >
              <IconeIA />
            </button>
            <span className="flex h-8 w-8 items-center justify-center hover:bg-slate-50">
              <User className="h-4 w-4" />
            </span>
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className={`relative flex h-8 w-8 items-center justify-center hover:bg-slate-50 ${notesOpen ? "bg-lime-100 text-slate-900" : ""}`}
              aria-label="Notes privées"
              title="Notes privées"
            >
              <NotebookPen className="h-4 w-4" />
              {patient.notes.length > 0 &&
                (notesDiscretes ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-semibold text-white">
                    {patient.notes.length}
                  </span>
                ) : (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                ))}
            </button>
            <span className="flex h-8 w-8 items-center justify-center hover:bg-slate-50">
              <Menu className="h-4 w-4" />
            </span>
            {iaOpen && <ResumeIAPopover patient={patient} onClose={() => setIaOpen(false)} />}
            {notesOpen && notesDiscretes && <NotesPopover {...notesProps} masque={notesMasquees} onMasque={setNotesMasquees} />}
          </div>
        </div>
        <p className="mt-1 text-[13px] text-slate-700">
          {patient.sexe} · {patient.naissance} · {patient.age} ans
        </p>
        <p className="mt-1 text-[13px] text-slate-700">
          {patient.tel} · {patient.email}
        </p>
        <div className="mt-3 flex items-center gap-2 text-[13px]">
          <span className="rounded-md border border-slate-200 px-2 py-1 text-slate-700">Solde +{patient.solde.toFixed(2)} €</span>
          <span className="flex overflow-hidden rounded-md border border-slate-200 text-[11px]">
            <span className={`px-2 py-1 ${patient.amo ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>AMO</span>
            <span className="px-2 py-1 text-slate-500">AMC</span>
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500">
            <RefreshCw className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-[13px] text-red-700">
          <CircleAlert className="h-3.5 w-3.5" />
          {patient.alertes.length ? patient.alertes.join(" · ") : "Aucune donnée médicale"}
        </div>
        {notesDiscretes && <NotesEpinglees notes={patient.notes} masque={notesMasquees} onOpen={() => setNotesOpen(true)} />}
        {patient.antecedents.length > 0 && (
          <div className="mt-2 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-[13px] text-slate-700">{patient.antecedents.join(" · ")}</div>
        )}
        <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-500">
          Mis à jour le {patient.majLe} <ExternalLink className="h-3 w-3" />
        </p>

        {docsMode ? (
          <DocsBarre
            recherche={recherche}
            onRecherche={setRecherche}
            onBack={fermerDocs}
            historique={docsMode === "historique"}
            onHistorique={() => setDocsMode((m) => (m === "historique" ? "docs" : "historique"))}
            migration={docsPatient.migration}
          />
        ) : (
          <div className="relative mt-3 flex items-center justify-between rounded-xl bg-white py-1 shadow-[0_6px_16px_-8px_rgba(15,23,42,0.25)]">
            <button
              onClick={() => setDocsMode("docs")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700"
              aria-label="Documents du patient"
              title="Documents du patient"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {[ClipboardList, CalendarClock, AtSign, CalendarDays].map((Icon, i) => (
                <span key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-[15px] font-medium">
                  <Icon className="h-4 w-4 text-slate-600" />
                  {patient.compteurs[i]}
                </span>
              ))}
            </div>
          </div>
        )}

        {!docsMode && <div className="mt-5 space-y-2.5 pb-24">
          {patient.rdvs.slice(0, 1).map(card)}
          {patient.devis && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
              <button onClick={() => setDevisOpen((v) => !v)} className="flex w-full items-center justify-between px-2 py-1.5 text-[13px]">
                <span className="flex items-center gap-2 text-slate-700">
                  <ClipboardList className="h-4 w-4" />
                  {patient.devis.id} <span className="text-slate-500">{patient.devis.praticien}</span>
                </span>
                <ChevronUp className={`h-4 w-4 text-slate-500 transition-transform ${devisOpen ? "" : "rotate-180"}`} />
              </button>
              {devisOpen && <div className="space-y-1.5">{patient.devis.etapes.map(card)}</div>}
            </div>
          )}
          {patient.rdvs.slice(1).map(card)}
        </div>}
      </aside>

      {/* ───────── Schéma + RDV ───────── */}
      <section className="relative min-w-0 flex-1 px-8 pt-4">
        {docsMode ? (
          <div className="mx-auto max-w-[1000px] pb-24">
            {docsMode === "historique" ? (
              <DocsHistorique docs={docsPatient} recherche={recherche} onClose={fermerDocs} onClasser={classer} classes={classesPatient} />
            ) : (
              <DocsOralys docs={docsPatient} recherche={recherche} onClose={fermerDocs} />
            )}
          </div>
        ) : (
        <>
        <button className="absolute right-6 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700" aria-label="Nouveau">
          <Plus className="h-5 w-5" />
        </button>

        <div className="flex justify-center">
          <Odontogramme
            etatDents={patient.etatDents}
            highlighted={new Set(focus.zone.dents)}
            caviteHighlighted={!!focus.zone.cavite}
            editing={editing}
            selection={new Set(selected.zone.dents)}
            caviteSelected={!!selected.zone.cavite}
            rdvsParDent={rdvsParDent}
            onToggleTooth={(n) => setZoneDents((s) => (s.has(n) ? s.delete(n) : s.add(n)))}
            onToggleCavite={() => updateRdv(selected.id, (r) => ({ ...r, zone: { ...r.zone, cavite: !r.zone.cavite } }))}
            onOpenRdv={selectRdv}
          />
        </div>

        {editing && (
          <div className="mx-auto mt-1 flex max-w-[760px] flex-wrap items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white shadow-lg animate-in fade-in slide-in-from-top-2">
            <Crosshair className="h-4 w-4" />
            <span className="mr-1">
              Cliquez sur les dents du RDV <b>{TYPES_RDV[selected.type].label}</b>
              {selected.date && <> du {formatDateCourte(selected.date)}</>}
            </span>
            <span className="flex flex-wrap gap-1">
              {[...QUADRANTS, ...SEXTANTS].map((s) => {
                const on = s.dents.every((d) => selected.zone.dents.includes(d));
                return (
                  <button
                    key={s.id}
                    title={`${s.label} · ${s.dents.join(", ")}`}
                    onClick={() => toggleGroupe(s.dents)}
                    className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${on ? "bg-white text-sky-700" : "bg-sky-500 hover:bg-sky-400"}`}
                  >
                    {s.id}
                  </button>
                );
              })}
              <button onClick={() => toggleGroupe(ARCADE_SUP)} className="rounded-md bg-sky-500 px-1.5 py-0.5 text-xs font-medium hover:bg-sky-400">
                Haut
              </button>
              <button onClick={() => toggleGroupe(ARCADE_INF)} className="rounded-md bg-sky-500 px-1.5 py-0.5 text-xs font-medium hover:bg-sky-400">
                Bas
              </button>
            </span>
            <span className="ml-auto flex gap-1">
              <button
                onClick={() => updateRdv(selected.id, (r) => ({ ...r, zone: { dents: [] } }))}
                className="rounded-md px-2 py-0.5 text-xs text-sky-100 hover:bg-sky-500"
              >
                Effacer
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-sky-700">
                <Check className="h-3.5 w-3.5" /> Terminé
              </button>
            </span>
          </div>
        )}

        <RdvDetail
          key={selected.id}
          rdv={selected}
          saveCount={saveCount}
          onAddObservation={(o) => updateRdv(selected.id, (r) => ({ ...r, observations: [...(r.observations ?? []), o] }))}
          onChecklist={(checklist) => updateRdv(selected.id, (r) => ({ ...r, checklist }))}
        />
        </>
        )}
      </section>

      {notesOpen && !notesDiscretes && <NotesModalActuelle {...notesProps} />}
      <ToastEnregistre n={toastCount} />

      {/* ───────── Bascules de comparaison (prototype) ───────── */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 text-xs">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 pl-3 shadow-lg backdrop-blur">
          <Workflow className="h-3.5 w-3.5 text-pink-500" />
          <span className="mr-1 whitespace-nowrap font-medium text-slate-500">Patient démo</span>
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => switchPatient(p.id)}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${p.id === patientId ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {p.nom}
            </button>
          ))}
        </div>
        {[
          { label: "Carte RDV", value: avecDents, set: setAvecDents, options: ["Actuelle", "Dents + motif"] },
          { label: "Notes privées", value: notesDiscretes, set: setNotesDiscretes, options: ["Actuelle", "Discrètes + épingles"] },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 p-1 pl-3 shadow-lg backdrop-blur">
            <Workflow className="h-3.5 w-3.5 text-pink-500" />
            <span className="w-[78px] font-medium text-slate-500">{row.label}</span>
            {row.options.map((label, k) => {
              const v = k === 1;
              return (
                <button
                  key={label}
                  onClick={() => {
                    row.set(v);
                    setNotesOpen(false);
                  }}
                  className={`rounded-full px-3 py-1.5 font-medium transition-colors ${row.value === v ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DetailProps {
  rdv: Rdv;
  saveCount: number;
  onAddObservation: (o: string) => void;
  onChecklist: (items: ItemChecklist[]) => void;
}

function RdvDetail({ rdv, saveCount, onAddObservation, onChecklist }: DetailProps) {
  const type = TYPES_RDV[rdv.type];
  const [obsDraft, setObsDraft] = useState<string | null>(null);
  const total = rdv.actes.reduce((s, a) => s + a.prix, 0);

  const date = rdv.date ? formatDateLongue(rdv.date) : null;

  return (
    <div className="mx-auto mt-4 max-w-[760px] pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-slate-800">
          {date ? (
            <>
              {date.jour} <b>{date.num}</b> {date.reste} · {rdv.heure} · Dr. {rdv.praticien.split(" ").at(-1)}
            </>
          ) : (
            <>Demande de planification</>
          )}
        </h2>
        <div className="flex rounded-lg border border-slate-200 text-slate-600">
          {[SquarePlus, ImagePlus, Workflow].map((Icon, i) => (
            <span key={i} className="flex h-8 w-8 items-center justify-center">
              <Icon className="h-4 w-4" />
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-[13px] ${type.pill}`}>{type.label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500">
          <History className="h-3.5 w-3.5" />
        </span>
        {saveCount > 0 && (
          // Rejoue l'animation à chaque enregistrement grâce à la clé.
          <span key={saveCount} className="saved-flash ml-auto flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Enregistré
          </span>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <NotebookPen className="h-4 w-4" /> Observations
          </span>
          <div className="flex gap-2">
            <button onClick={() => setObsDraft("")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" /> Rédiger
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[13px] text-white hover:bg-slate-700">
              <Crosshair className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
        </div>
        {(rdv.observations?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-1">
            {rdv.observations!.map((o, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-slate-700">
                <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                {o}
              </li>
            ))}
          </ul>
        )}
        {obsDraft !== null && (
          <textarea
            autoFocus
            value={obsDraft}
            onChange={(e) => setObsDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && obsDraft.trim()) {
                e.preventDefault();
                onAddObservation(obsDraft.trim());
                setObsDraft(null);
              }
              if (e.key === "Escape") setObsDraft(null);
            }}
            placeholder="Observation… (Entrée pour valider)"
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-sky-400"
            rows={2}
          />
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <Euro className="h-4 w-4" /> Actes {rdv.actes.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
          </span>
          <span className="flex items-center gap-1 text-[13px] text-slate-500">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </span>
        </div>
        {rdv.actes.length > 0 && (
          <>
            <table className="mt-2 w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase text-slate-400">
                  <th className="w-12" />
                  <th className="py-1 text-left font-medium">Code</th>
                  <th className="py-1 text-left font-medium">Dents</th>
                  <th className="py-1 text-left font-medium">Acte</th>
                  <th className="py-1 text-right font-medium">RàC</th>
                  <th className="py-1 text-right font-medium">Prix</th>
                </tr>
              </thead>
              <tbody>
                {rdv.actes.map((a, i) => (
                  <tr key={i} className="text-slate-700">
                    <td className="py-1.5 text-slate-300">✓ ✕</td>
                    <td className="py-1.5 font-mono text-[12px]">{a.code}</td>
                    <td className="py-1.5">{a.dents.join(", ") || "–"}</td>
                    <td className="py-1.5">{a.libelle}</td>
                    <td className="py-1.5 text-right text-slate-500">{formatEuros(a.rac)}</td>
                    <td className="py-1.5 text-right font-semibold">{formatEuros(a.prix)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto mt-2 grid w-80 grid-cols-3 divide-x divide-slate-200 rounded-lg bg-slate-50 py-1.5 text-center text-[11px] text-slate-500">
              <span>
                SOLDE PATIENT<b className="block text-[13px] text-slate-800">{formatEuros(total)}</b>
              </span>
              <span>
                À PAYER<b className="block text-[13px] text-slate-800">--</b>
              </span>
              <span>
                TOTAL PRÉVU<b className="block text-[13px] text-slate-800">{formatEuros(total)}</b>
              </span>
            </div>
          </>
        )}
      </div>

      <Checklist items={rdv.checklist ?? []} onChange={onChecklist} />
    </div>
  );
}
