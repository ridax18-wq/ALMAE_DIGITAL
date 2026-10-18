"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SyncIcon } from "@/components/icons";

export function RecheckAuto({ intervaloMs = 3000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervaloMs);

    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return (
    <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
      <SyncIcon className="size-3.5" />
      Revisando el estado cada {Math.round(intervaloMs / 1000)} segundos…
    </p>
  );
}
