"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVALO_MS = 15_000;

export function ActualizadorBandeja() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const iniciar = () => {
      if (timer !== null) return;
      timer = setInterval(() => router.refresh(), INTERVALO_MS);
    };
    const detener = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        iniciar();
      } else {
        detener();
      }
    };

    if (document.visibilityState === "visible") iniciar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      detener();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [router]);

  return null;
}
