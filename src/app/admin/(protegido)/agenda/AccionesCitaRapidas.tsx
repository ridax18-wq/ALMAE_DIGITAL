"use client";

import { useState } from "react";
import { marcarCompletada, marcarNoShow } from "@/app/admin/(protegido)/reservas/actions";
import { CancelarCita } from "@/app/admin/(protegido)/reservas/[id]/CancelarCita";

export function AccionesCitaRapidas({
  bookingId,
  servicio,
}: {
  bookingId: string;
  servicio: string;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-lg border border-sand-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-sand-100">
        Acciones de cita <span aria-hidden>▾</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <input
          name="motivo-asistencia"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={200}
          placeholder="Observación (opcional)"
          aria-label="Observación de asistencia"
          className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <form action={marcarCompletada}>
            <input type="hidden" name="booking_id" value={bookingId} />
            <input type="hidden" name="motivo" value={motivo} />
            <button
              type="submit"
              className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Asistió
            </button>
          </form>
          <form action={marcarNoShow}>
            <input type="hidden" name="booking_id" value={bookingId} />
            <input type="hidden" name="motivo" value={motivo} />
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50"
            >
              No asistió
            </button>
          </form>
        </div>
        <CancelarCita bookingId={bookingId} servicio={servicio} compacto />
        <a
          href={`/admin/reservas/${bookingId}`}
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          Ver detalle, historial y reprogramar →
        </a>
      </div>
    </details>
  );
}
