"use client";

import { Phone, UsersRound } from "lucide-react";
import { useTeam } from "@/context/TeamDataContext";
import { RoleBadges, UserAvatar } from "@/components/team/shared";
import { usePersonSheet } from "@/components/team/PersonSheet";
import { travailleAvec } from "@/components/team/profile/Fiche";
import { useVersion } from "@/components/team/Version";
import { assiduite } from "@/lib/assiduite";
import { hasCongesPayes } from "@/lib/conges";
import { missionsSummary, personMissionRate, rateColor, rateTone } from "@/lib/missions";
import { ABSENCE_TYPE_LABELS, ROLE_GROUP_LABELS, ROLE_ORDER, absenceOn, fullName, isHealthProfessional, primaryRoleId, worksOn } from "@/lib/team";
import { TeamUser } from "@/types/team";
import { toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Trombinoscope du cabinet, visible par tout le monde : photo, nom, rôle, avec qui la personne travaille,
 * et si elle est là aujourd'hui. Le gestionnaire et les praticiens voient en plus l'état des missions
 * et l'assiduité. Un clic ouvre le récapitulatif de la personne.
 */
export function Trombinoscope({ users }: { users?: TeamUser[] }) {
  const { users: all, profiles, absences, now, can, sessionUser, roles } = useTeam();
  const { open } = usePersonSheet();
  // Suivi des missions (pastille, taux) : V1.
  const suivi = useVersion().has("missionsSuivies");
  const today = toISODate(now());
  const sensitive = can("param.cabinet") || (!!sessionUser && isHealthProfessional(sessionUser, roles)) || can("compta");
  const actifs = (users ?? all).filter((u) => u.status === "actif");
  const groups = [...ROLE_ORDER, "autre"]
    .map((rid) => ({ rid, people: actifs.filter((u) => primaryRoleId(u) === rid || (rid === "autre" && !ROLE_ORDER.includes(primaryRoleId(u)))) }))
    .filter((g) => g.people.length);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.rid}>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {ROLE_GROUP_LABELS[g.rid] ?? "Autres"} <span className="font-normal text-slate-400">· {g.people.length}</span>
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {g.people
              // Présents d'abord, puis absents et personnes au repos.
              .sort((a, b) => {
                const off = (u: TeamUser) => Number(!worksOn(u, today) || Boolean(absenceOn(u.id, today, absences)));
                return off(a) - off(b) || a.lastName.localeCompare(b.lastName);
              })
              .map((u) => {
                const abs = absenceOn(u.id, today, absences);
                const works = worksOn(u, today);
                const avec = travailleAvec(u, profiles);
                const ms = sensitive && suivi ? missionsSummary(u, today) : null;
                // Pastille : la couleur suit le taux de réalisation sur 8 semaines, du rouge au vert.
                const rate = sensitive && suivi ? personMissionRate(u, today, (iso) => worksOn(u, iso)) : null;
                const ass = sensitive && hasCongesPayes(u) ? assiduite(u, absences, today) : null;
                return (
                  <li key={u.id}>
                    <button
                      onClick={() => open(u.id)}
                      className="flex h-full w-full flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:outline-none"
                    >
                      <span className="relative">
                        <UserAvatar user={u} className={cn("size-20 text-xl", (abs || !works) && "opacity-60")} />
                        {ms?.tone && (
                          <span
                            className={cn(
                              "absolute -right-0.5 -bottom-0.5 size-4 rounded-full border-2 border-white",
                              !rate && (ms.tone === "rouge" ? "bg-rose-500" : ms.tone === "orange" ? "bg-amber-400" : "bg-emerald-500")
                            )}
                            style={rate ? { backgroundColor: rateColor(rate.taux) } : undefined}
                            title={
                              rate
                                ? `Missions réalisées à ${rate.taux} % sur 8 semaines`
                                : ms.tone === "rouge"
                                  ? `${ms.enRetard.length} mission(s) en retard`
                                  : ms.tone === "orange"
                                    ? "Mission à faire aujourd'hui"
                                    : "Missions à jour"
                            }
                          />
                        )}
                      </span>
                      <span>
                        <span className="block font-medium text-slate-900">{fullName(u)}</span>
                        <span className="mt-1 flex justify-center">
                          <RoleBadges user={u} />
                        </span>
                      </span>
                      {avec && (
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <UsersRound className="size-3" /> Travaille avec {avec.label}
                        </span>
                      )}
                      {u.phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                          <Phone className="size-3" /> {u.phone}
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          abs ? "bg-rose-50 text-rose-700" : works ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {abs ? `Absent(e) : ${ABSENCE_TYPE_LABELS[abs.type].toLowerCase()}` : works ? "Présent(e) aujourd'hui" : "Repos aujourd'hui"}
                      </span>
                      {(ms?.tone || ass) && (
                        <span className="flex flex-wrap justify-center gap-x-2 text-[11px] text-slate-500">
                          {rate && (
                            <span className={rateTone(rate.taux) === "vert" ? "text-emerald-700" : rateTone(rate.taux) === "orange" ? "text-amber-700" : "text-rose-700"}>
                              Missions {rate.taux} %
                            </span>
                          )}
                          {ms?.tone === "rouge" && <span className="text-rose-700">{ms.enRetard.length} en retard</span>}
                          {!rate && ms?.tone === "orange" && <span className="text-amber-700">{ms.aFaire.length} à faire</span>}
                          {!rate && ms?.tone === "vert" && <span className="text-emerald-700">Missions à jour</span>}
                          {ass && <span>Assiduité {ass.taux.toLocaleString("fr-FR")} %</span>}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
