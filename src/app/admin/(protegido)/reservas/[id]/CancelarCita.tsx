"use client";

import { useState } from "react";
import { cancelarAdmin } from "@/app/admin/(protegido)/reservas/actions";

export function CancelarCita({
  bookingId,
  servicio,
  compacto = false,
}: {
  bookingId: string;
  servicio: string;
  compacto?: boolean;
}) {
  const [motivo, setMotivo] = useState("");

  function confirmarEnvio(event: React.FormEvent<HTMLFormElement>): void {
    if (motivo.trim().length < 3) return;
    event.preventDefault();
    const acepta = window.confirm(
      `¿Cancelar la cita "${servicio}"?\n\nEsta acción libera el horario. Motivo: ${motivo.trim()}`,
    );
    if (acepta) {
      event.currentTarget.submit();
    }
  }

  const valido = motivo.trim().length >= 3;

  if (compacto) {
    return (
      <form action={cancelarAdmin} onSubmit={confirmarEnvio} className="flex gap-2">
        <input type="hidden" name="booking_id" value={bookingId} />
        <input
          name="motivo"
          required
          minLength={3}
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (obligatorio)"
          aria-label="Motivo de cancelación"
          className="flex-1 rounded-lg border border-sand-200 px-2 py-2 text-xs"
        />
        <button
          type="submit"
          disabled={!valido}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <form action={cancelarAdmin} onSubmit={confirmarEnvio} className="mt-3 flex flex-col gap-2 border-t border-sand-200 pt-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <label className="text-xs font-semibold text-ink-700" htmlFor="motivo-cancelar">
        Motivo de cancelación
      </label>
      <textarea
        id="motivo-cancelar"
        name="motivo"
        required
        minLength={3}
        maxLength={200}
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej: el paciente no podrá asistir"
        className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={!valido}
        className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancelar cita
      </button>
    </form>
  );
}
