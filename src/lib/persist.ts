"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

/** Toutes les clés de la démo commencent par ce préfixe : la réinitialisation les efface toutes. */
const PREFIX = "oralys-";

/**
 * État gardé en mémoire dans le navigateur (vue choisie, filtres, réglages de postes…).
 * Lecture synchrone : n'utiliser que sous AgendaDataProvider, qui ne rend son contenu que côté client.
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  /** Valeur imposée par un lien direct (paramètre d'URL) : prioritaire sur la valeur sauvegardée. */
  override?: T | null
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `${PREFIX}ui-${key}`;
  const [value, setValue] = useState<T>(() => {
    if (override !== undefined && override !== null) return override;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Stockage indisponible ou valeur illisible : valeur par défaut.
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // On continue sans persister.
    }
  }, [storageKey, value]);
  return [value, setValue];
}

/** « Réinitialiser la démo » : efface tout ce qui a été sauvegardé et repart des données du jour. */
export function resetAllDemoData() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Rien à effacer.
  }
  window.location.reload();
}
