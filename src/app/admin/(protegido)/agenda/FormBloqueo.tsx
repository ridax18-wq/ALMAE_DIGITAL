"use client";

import { useState } from "react";
import { bloquearHorario } from "./actions";
import { TIPOS_BLOQUEO, validarIntervaloBloqueo, vistaPreviaBloqueo } from "@/lib/services/bloqueos-agenda";

const CAMPO = "rounded-lg border border-sand-200 bg-white px-2 py-2 text-sm";

export function FormBloqueo({ fechaHoy }: { fechaHoy: string }) {
  const [fechaInicio, setFechaInicio] = useState(fechaHoy);
  const [horaInicio, setHoraInicio] = useState("");
  const [fechaFin, setFechaFin] = useState(fechaHoy);
  const [horaFin, setHoraFin] = useState("");

  const intervalo = { fechaInicio, horaInicio, fechaFin, horaFin };
  const preview = vistaPreviaBloqueo(intervalo);
  const validacion = validarIntervaloBloqueo(intervalo);
  const errorIntervalo = !horaInicio || !horaFin || validacion.ok ? null : validacion.error;

  return (
    <form action={bloquearHorario} className="mt-3 flex flex-col gap-2.5">
      <div className="flex gap-2">
        <input
          name="fecha_inicio"
          type="date"
          required
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          aria-label="Fecha del bloqueo"
          className={`w-1/2 ${CAMPO}`}
        />
        <input
          name="hora_inicio"
          type="time"
          required
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          aria-label="Inicio del bloqueo"
          className={`w-1/2 ${CAMPO}`}
        />
      </div>
      <div className="flex gap-2">
        <input
          name="fecha_fin"
          type="date"
          required
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          aria-label="Fecha de fin del bloqueo"
          className={`w-1/2 ${CAMPO}`}
        />
        <input
          name="hora_fin"
          type="time"
          required
          value={horaFin}
          onChange={(e) => setHoraFin(e.target.value)}
          aria-label="Fin del bloqueo"
          className={`w-1/2 ${CAMPO}`}
        />
      </div>
      <select name="tipo" aria-label="Tipo de bloqueo" defaultValue="BREAK" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm">
        {TIPOS_BLOQUEO.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.etiqueta}
          </option>
        ))}
      </select>
      <input name="motivo" maxLength={120} placeholder="Motivo (opcional)" className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
      <div aria-live="polite" className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink-700">
        {errorIntervalo ? (
          <span className="text-red-800">{errorIntervalo}</span>
        ) : preview ? (
          <span>Vista previa: {preview}</span>
        ) : (
          <span>Completa fecha y hora de inicio y fin (hora de Lima).</span>
        )}
      </div>
      <button
        type="submit"
        disabled={!validacion.ok}
        className="rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Bloquear horario
      </button>
    </form>
  );
}
