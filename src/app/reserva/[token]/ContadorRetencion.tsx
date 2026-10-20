"use client";

import { useEffect, useState } from "react";

function restante(vence: number): string {
  const ms = Math.max(0, vence - Date.now());
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export function ContadorRetencion({ venceIso }: { venceIso: string | null }) {
  const [renderizable, setRenderizable] = useState(false);

  useEffect(() => {
    setRenderizable(true);
  }, []);

  if (!venceIso) return null;

  const vence = new Date(venceIso).getTime();

  if (Number.isNaN(vence)) return null;

  if (!renderizable) {
    return (
      <p className="mt-3 text-sm font-semibold text-amber-900">
        Tiempo restante de la retención: consultando…
      </p>
    );
  }

  const expirada = vence <= Date.now();

  return (
    <p
      role="timer"
      className={`mt-3 text-sm font-semibold ${expirada ? "text-red-800" : "text-amber-900"}`}
    >
      {expirada
        ? "La retención venció; el horario se liberará automáticamente. Si ya coordinaste con ALMAE, escríbenos para retomar tu cita."
        : `Tiempo restante de la retención: ${restante(vence)} (min:seg)`}
    </p>
  );
}
