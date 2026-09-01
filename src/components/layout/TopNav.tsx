"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CABINET_NAME } from "@/data/mockData";

const NAV_ITEMS = [
  { label: "Activité", href: "/", enabled: false },
  { label: "Patients", href: "/patients", enabled: false },
  { label: "Agenda", href: "/agenda", match: ["/agenda", "/reglages"], enabled: true },
  { label: "Téléconsultation", href: "/teleconsultation", enabled: false },
  { label: "Stérilisation", href: "/sterilisation", enabled: false },
  { label: "Comptabilité", href: "/comptabilite", enabled: false },
];

export function TopNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b-[3px] border-lime-300 bg-white">
      <div className="relative flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/agenda" className="flex items-center gap-1.5 text-lg font-semibold text-slate-900">
            <span className="text-sky-600">●</span>
            oralys
          </Link>
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
                  className={isActive ? "font-medium text-slate-900" : "text-slate-500 hover:text-slate-800"}
                >
                  {item.label}
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
