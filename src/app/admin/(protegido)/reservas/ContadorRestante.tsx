"use client";

import { useEffect, useState } from "react";
import { formatearRestante, tiempoRestanteMs } from "@/lib/services/bandeja-reservas";

export function ContadorRestante({ vencimientoIso }: { vencimientoIso: string }) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    const actualizar = () => setAhora(Date.now());
    const primera = setTimeout(actualizar, 0);
    const timer = setInterval(actualizar, 1000);
    return () => {
      clearTimeout(primera);
      clearInterval(timer);
    };
  }, []);

  if (ahora === null) return <span className="font-mono text-sm">--:--</span>;

  const restante = tiempoRestanteMs(vencimientoIso, ahora);
  if (restante <= 0) {
    return <span className="font-semibold text-red-800">Vencida</span>;
  }
  return <span className="font-mono text-sm font-semibold">{formatearRestante(restante)}</span>;
}
