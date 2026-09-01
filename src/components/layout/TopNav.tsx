"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CABINET_NAME } from "@/data/mockData";

const NAV_ITEMS = [
  { label: "Activité", href: "/" },
  { label: "Patients", href: "/patients" },
  { label: "Agenda", href: "/agenda", match: ["/agenda", "/reglages"] },
  { label: "Téléconsultation", href: "/teleconsultation" },
  { label: "Stérilisation", href: "/sterilisation" },
  { label: "Comptabilité", href: "/comptabilite" },
];

export function TopNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/agenda" className="flex items-center gap-1.5 text-lg font-semibold text-slate-900">
          <span className="text-sky-600">●</span>
          oralys
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = (item.match ?? [item.href]).some(
              (path) => pathname === path || pathname.startsWith(path + "/")
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "font-medium text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-600">
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
    </header>
  );
}
