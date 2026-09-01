const AGENDA_SUB_ITEMS = [
  { label: "Types d'activité", href: "#types-activite" },
  { label: "Semaine type", href: "#semaine-type" },
  { label: "Créneaux spéciaux", href: "#creneaux-speciaux" },
  { label: "Périodes d'absence", href: "#periodes-absence" },
];

export function SidebarReglages() {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 text-sm">
      <div className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-500">
        <span>👤</span>
        <span>Praticien</span>
      </div>
      <div className="mb-1 flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1.5 font-medium text-slate-900">
        <span>📅</span>
        <span>Agenda</span>
      </div>
      <ul className="mb-2 ml-6 border-l border-slate-200 pl-3">
        {AGENDA_SUB_ITEMS.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="block rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-500">
        <span>📋</span>
        <span>Motifs rendez-vous</span>
      </div>
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-500">
        <span>📄</span>
        <span>Modèles de documents</span>
      </div>
    </aside>
  );
}
