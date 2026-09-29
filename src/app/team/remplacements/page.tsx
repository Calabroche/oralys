"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Les remplacements vivent maintenant dans le planning (onglet « À remplacer ») : les anciens liens y mènent. */
export default function RemplacementsRedirect() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}

function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", "remplacer");
    router.replace(`/team/planning?${next.toString()}`);
  }, [router, params]);
  return null;
}
