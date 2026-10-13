import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Adresse du vrai Oralys Soins quand Team tourne dans la démo Oralys (NEXT_PUBLIC_SOINS_URL, ex. "/").
 * Hors démo, on reste sur la maquette Soins de ce projet (/agenda, /reglages…).
 */
export const SOINS_URL = process.env.NEXT_PUBLIC_SOINS_URL;

/** Lien vers Soins : la page de la maquette ici, l'accueil du vrai Soins dans la démo (hors Next, donc rechargement complet). */
export function SoinsLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  if (SOINS_URL) return <a href={SOINS_URL} {...props} />;
  return <Link href={href} {...props} />;
}
