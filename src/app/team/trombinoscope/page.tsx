import { redirect } from "next/navigation";

/** Le trombinoscope vit dans le tableau de bord (pas de page à part). */
export default function TrombinoscopePage() {
  redirect("/team");
}
