"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CABINET_NAME } from "@/data/mockData";
import { itemsStock, useDossiers } from "@/context/DossiersContext";

const NAV_ITEMS = [
  { label: "Activité", href: "/activite", enabled: true },
  { label: "Patients", href: "/patients", enabled: true },
  { label: "Agenda", href: "/agenda", match: ["/agenda", "/reglages"], enabled: true },
  { label: "Téléconsultation", href: "/teleconsultation", enabled: false },
  { label: "Stérilisation", href: "/sterilisation", enabled: false },
  { label: "Stock", href: "/stock", enabled: true },
  { label: "Comptabilité", href: "/comptabilite", enabled: false },
];

export function TopNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [planetOpen, setPlanetOpen] = useState(false);
  const { patients } = useDossiers();
  const aCommander = itemsStock(patients).filter((l) => l.commande.statut === "a-commander").length;

  // La planète Team a son propre en-tête (liseré rose).
  if (pathname.startsWith("/team")) return null;

  return (
    <header className="border-b-[3px] border-lime-300 bg-white">
      <div className="relative flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/agenda" className="flex items-center gap-1.5 text-lg font-semibold text-slate-900">
            <span className="text-sky-600">●</span>
            oralys
          </Link>
          <div className="relative">
            <button
              onClick={() => setPlanetOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-lime-200 bg-lime-50 px-2.5 py-1 text-sm font-medium text-lime-900 hover:bg-lime-100"
            >
              <span className="h-2 w-2 rounded-full bg-lime-400" />
              Soins
              <span className="text-xs text-lime-700">▾</span>
            </button>
            {planetOpen && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setPlanetOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
                  <div className="px-3 py-1.5 text-xs text-slate-400">Univers Oralys</div>
                  <span className="flex items-center gap-2 px-3 py-2 font-medium text-slate-900">
                    <span className="h-2.5 w-2.5 rounded-full bg-lime-300" /> Oralys Soins ✓
                  </span>
                  <Link href="/team/accueil" onClick={() => setPlanetOpen(false)} className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50">
                    <span className="h-2.5 w-2.5 rounded-full bg-pink-400" /> Oralys Team
                  </Link>
                </div>
              </>
            )}
          </div>
          <span className="text-slate-400" aria-hidden>
            🔍
          </span>
          <nav className="flex items-center gap-6 text-sm">
            {NAV_ITEMS.map((item) => {
              if (!item.enabled) {
                return (
                  <span
                    key={item.href}
                    title="Bientôt disponible"
                    className="cursor-not-allowed text-slate-300"
                  >
                    {item.label}
                  </span>
                );
              }
              const isActive = (item.match ?? [item.href]).some(
                (path) => pathname === path || pathname.startsWith(path + "/")
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 ${isActive ? "font-medium text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {item.label}
                  {item.href === "/stock" && aCommander > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800" title={`${aCommander} à commander`}>
                      {aCommander}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="text-slate-300" aria-hidden>
            ✉️
          </span>
          <span className="text-slate-300" aria-hidden>
            📋
          </span>
          <span className="flex items-center gap-1">
            {CABINET_NAME}
            <span className="text-xs text-slate-400">▾</span>
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-medium text-sky-700 hover:bg-sky-200"
              aria-label="Menu utilisateur"
            >
              DG
            </button>

            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
                  <Link
                    href="/reglages/agenda"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    ⚙️ Paramètres
                  </Link>
                  <Link
                    href="/reglages/agenda"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    👤 Mon compte
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-500 hover:bg-slate-50">
                    ↪ Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
