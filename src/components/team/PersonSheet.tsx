"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import { UserSheet } from "@/components/team/users/UserSheet";
import { cn } from "@/lib/utils";

const PersonSheetContext = createContext<{ open: (userId: string) => void }>({ open: () => undefined });

/** Une seule fiche personne pour tout Team : n'importe quel nom l'ouvre, elle relie ensuite les sections. */
export function PersonSheetProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  return (
    <PersonSheetContext.Provider value={{ open: setUserId }}>
      {children}
      <UserSheet userId={userId} onClose={() => setUserId(null)} />
    </PersonSheetContext.Provider>
  );
}

export function usePersonSheet() {
  return useContext(PersonSheetContext);
}

/** Nom cliquable qui ouvre la fiche de la personne. */
export function PersonLink({ userId, children, className }: { userId: string; children: ReactNode; className?: string }) {
  const { open } = usePersonSheet();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open(userId);
      }}
      className={cn("text-left decoration-pink-300 underline-offset-2 hover:text-pink-700 hover:underline", className)}
    >
      {children}
    </button>
  );
}
