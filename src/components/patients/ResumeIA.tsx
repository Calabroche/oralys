"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { TYPES_RDV, type Patient, type Rdv } from "@/data/dossierPatient";
import { allRdvs } from "@/context/DossiersContext";
import { resumeDents } from "@/lib/dents";
import { formatDateCourte } from "@/components/patients/format";

/** Étoile à 4 branches en dégradé, le code visuel habituel de l'IA (Gemini, etc.). */
export function IconeIA({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="ia-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4285f4" />
          <stop offset="55%" stopColor="#9b72cb" />
          <stop offset="100%" stopColor="#d96570" />
        </linearGradient>
      </defs>
      <path d="M12 2c.6 5.3 4.7 9.4 10 10-5.3.6-9.4 4.7-10 10-.6-5.3-4.7-9.4-10-10 5.3-.6 9.4-4.7 10-10Z" fill="url(#ia-grad)" />
    </svg>
  );
}

const zoneTexte = (r: Rdv) =>
  resumeDents(r.zone, { sextants: r.type === "paro" })
    .filter((c) => c.kind !== "bouche")
    .map((c) => c.label)
    .join(", ");

const ligneRdv = (r: Rdv) => {
  const zone = zoneTexte(r);
  return [r.motif || TYPES_RDV[r.type].label, zone].filter(Boolean).join(" · ");
};

/**
 * Résumé du dossier façon IA, calculé à partir des données (prototype) :
 * en bref, vigilance, notes importantes, soins récents, à venir, à faire.
 */
function resumer(patient: Patient) {
  const today = new Date().toISOString().slice(0, 10);
  const rdvs = allRdvs(patient);
  const passes = rdvs.filter((r) => r.date && r.date < today).sort((a, b) => b.date!.localeCompare(a.date!));
  const futurs = rdvs.filter((r) => r.date && r.date >= today).sort((a, b) => a.date!.localeCompare(b.date!));
  const aPlanifier = rdvs.filter((r) => !r.date);
  const prochain = futurs[0];

  const enBref = [
    `${patient.prenom}, ${patient.age} ans, ${rdvs.length} RDV au dossier.`,
    prochain
      ? `Prochain RDV le ${formatDateCourte(prochain.date!)} : ${TYPES_RDV[prochain.type].label.toLowerCase()}${prochain.motif ? `, ${prochain.motif.toLowerCase()}` : ""}.`
      : "Aucun RDV à venir.",
    patient.devis ? `Un devis en cours (${patient.devis.etapes.length} étapes).` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const vigilance = [...patient.alertes, ...patient.antecedents.filter((a) => !["Antécédents", "Médicaments"].includes(a))];
  const notes = [...patient.notes].sort((a, b) => Number(b.epinglee) - Number(a.epinglee)).slice(0, 3);

  const recents = passes.slice(0, 3).map((r) => ({
    id: r.id,
    date: formatDateCourte(r.date!),
    texte: ligneRdv(r),
    detail: r.observations?.at(-1),
  }));
  const aVenir = [
    ...futurs.slice(0, 2).map((r) => ({ id: r.id, date: formatDateCourte(r.date!), texte: ligneRdv(r) })),
    ...aPlanifier.map((r) => ({ id: r.id, date: "À planifier", texte: ligneRdv(r) })),
  ];

  const aFaire: string[] = [];
  const impayes = passes.filter((r) => r.pastilles.includes("paiement-du")).length;
  if (impayes) aFaire.push(`${impayes} RDV passé${impayes > 1 ? "s" : ""} avec un paiement dû (solde +${patient.solde.toFixed(2)} €).`);
  const aCommander = rdvs.flatMap((r) => r.checklist ?? []).filter((i) => i.commande?.statut === "a-commander");
  if (aCommander.length) aFaire.push(`Matériel à commander : ${aCommander.map((i) => i.label).join(", ")}.`);
  if (!patient.alertes.length) aFaire.push("Questionnaire médical à compléter.");

  return { enBref, vigilance, notes, recents, aVenir, aFaire };
}

interface Props {
  patient: Patient;
  onClose: () => void;
}

export function ResumeIAPopover({ patient, onClose }: Props) {
  const [generation, setGeneration] = useState(0);
  const [genereeA, setGenereeA] = useState(-1);
  const pret = genereeA === generation;
  const r = resumer(patient);

  // Petit temps de « génération » pour que ça se lise comme un résumé IA, rejoué à chaque régénération.
  useEffect(() => {
    const t = setTimeout(() => setGenereeA(generation), 900);
    return () => clearTimeout(t);
  }, [generation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titre = (t: string) => <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t}</h4>;

  return (
    <>
      <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-[336px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-violet-50 to-rose-50 px-4 py-2.5">
          <IconeIA className={`h-4 w-4 ${pret ? "" : "animate-spin"}`} />
          <span className="text-[13px] font-semibold text-slate-800">Résumé IA</span>
          <span className="text-[11px] text-slate-500">· {patient.prenom} {patient.nom}</span>
          <button
            onClick={() => setGeneration((g) => g + 1)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/70"
            aria-label="Régénérer"
            title="Régénérer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/70" aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {!pret ? (
          <div className="space-y-2 px-4 py-4">
            {[92, 78, 85, 60, 70].map((w, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-gradient-to-r from-sky-100 via-violet-100 to-rose-100" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <div className="max-h-[460px] space-y-3.5 overflow-y-auto px-4 py-3.5 text-[13px] leading-snug text-slate-700 animate-in fade-in duration-300">
            <p className="text-slate-800">{r.enBref}</p>

            {r.vigilance.length > 0 && (
              <section>
                {titre("À surveiller")}
                <div className="flex flex-wrap gap-1">
                  {r.vigilance.map((v) => (
                    <span key={v} className="rounded-md bg-red-50 px-1.5 py-0.5 text-[12px] text-red-700">
                      {v}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {r.notes.length > 0 && (
              <section>
                {titre("Notes importantes")}
                <ul className="space-y-1">
                  {r.notes.map((n) => (
                    <li key={n.id} className="flex gap-1.5">
                      <span className={n.epinglee ? "text-amber-500" : "text-slate-300"}>•</span>
                      <span>
                        {n.texte} <span className="text-[11px] text-slate-400">({n.auteur})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {r.recents.length > 0 && (
              <section>
                {titre("Soins récents")}
                <ul className="space-y-1">
                  {r.recents.map((x) => (
                    <li key={x.id}>
                      <span className="tabular-nums text-slate-400">{x.date}</span> · {x.texte}
                      {x.detail && <div className="pl-3 text-[12px] italic text-slate-500">« {x.detail} »</div>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {r.aVenir.length > 0 && (
              <section>
                {titre("À venir")}
                <ul className="space-y-1">
                  {r.aVenir.map((x) => (
                    <li key={x.id}>
                      <span className="tabular-nums text-slate-400">{x.date}</span> · {x.texte}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {r.aFaire.length > 0 && (
              <section>
                {titre("À faire")}
                <ul className="space-y-1">
                  {r.aFaire.map((t) => (
                    <li key={t} className="flex gap-1.5">
                      <span className="text-violet-400">→</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-400">Généré à partir du dossier. À vérifier avant toute décision clinique.</p>
          </div>
        )}
      </div>
    </>
  );
}
