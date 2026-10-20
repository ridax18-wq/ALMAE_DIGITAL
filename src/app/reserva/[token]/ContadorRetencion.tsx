"use client";

import { useEffect, useState } from "react";

function restanteEn(vence: number): { texto: string; expirada: boolean } {
  const ms = Math.max(0, vence - Date.now());
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return {
    texto: `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`,
    expirada: vence <= Date.now(),
  };
}

export function ContadorRetencion({ venceIso }: { venceIso: string | null }) {
  const [estado, setEstado] = useState<{ texto: string; expirada: boolean } | null>(null);

  useEffect(() => {
    const vence = venceIso ? new Date(venceIso).getTime() : Number.NaN;
    if (Number.isNaN(vence)) return;

    const actualizar = () => setEstado(restanteEn(vence));
    const primerTick = setTimeout(actualizar, 0);
    const intervalo = setInterval(actualizar, 1000);

    return () => {
      clearTimeout(primerTick);
      clearInterval(intervalo);
    };
  }, [venceIso]);

  if (!venceIso) return null;

  if (!estado) {
    return (
      <p className="mt-3 text-sm font-semibold text-amber-900">
        Tiempo restante de la retención: consultando…
      </p>
    );
  }

  return (
    <p
      role="timer"
      className={`mt-3 text-sm font-semibold ${estado.expirada ? "text-red-800" : "text-amber-900"}`}
    >
      {estado.expirada
        ? "La retención venció; el horario se liberará automáticamente. Si ya coordinaste con ALMAE, escríbenos para retomar tu cita."
        : `Tiempo restante de la retención: ${estado.texto} (min:seg)`}
    </p>
  );
}
