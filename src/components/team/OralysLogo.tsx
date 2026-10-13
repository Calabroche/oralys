import { cn } from "@/lib/utils";

/**
 * Logo Oralys : le fichier officiel d'Oralys Soins (apps/oralys-front/public/images/oralys-logo-text.png),
 * à la même hauteur que dans l'en-tête de Soins (h-7). Soins est la référence : ne pas le redessiner.
 */
export function OralysLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/oralys-logo-text.png" alt="Oralys" className={cn("h-7 w-auto max-w-none shrink-0", className)} />;
}
