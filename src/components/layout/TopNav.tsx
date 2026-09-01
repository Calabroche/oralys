"use client";

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

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
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
        <div className="h-8 w-8 rounded-full bg-sky-100 text-center text-sm font-medium leading-8 text-sky-700">
          DG
        </div>
      </div>
    </header>
  );
}
