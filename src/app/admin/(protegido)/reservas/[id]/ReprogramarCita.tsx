"use client";

import { useState } from "react";
import { reprogramarAdmin } from "@/app/admin/(protegido)/reservas/actions";
import { consultarHorariosAdmin } from "@/app/admin/(protegido)/agenda/actions";

export function ReprogramarCita({
  bookingId,
  variantId,
  servicio,
  duracion,
  fechaActual,
}: {
  bookingId: string;
  variantId: string;
  servicio: string;
  duracion: number;
  fechaActual: string;
}) {
  const [fecha, setFecha] = useState(fechaActual);
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [horas, setHoras] = useState<string[]>([]);
  const [estado, setEstado] = useState<"inactivo" | "cargando" | "listo" | "error">("inactivo");
  const [error, setError] = useState("");

  async function consultar(): Promise<void> {
    setEstado("cargando");
    setError("");
    const datos = new FormData();
    datos.set("variant_id", variantId);
    datos.set("fecha", fecha);
    const resultado = await consultarHorariosAdmin(datos);
    if (resultado.ok) {
      setHoras(resultado.horas);
      setEstado("listo");
    } else {
      setError(resultado.error);
      setEstado("error");
    }
  }

  function confirmarEnvio(event: React.FormEvent<HTMLFormElement>): void {
    if (!fecha || !hora || motivo.trim().length < 3) return;
    event.preventDefault();
    const acepta = window.confirm(
      `¿Reprogramar "${servicio}" al ${fecha} a las ${hora}?\n\nMotivo: ${motivo.trim()}`,
    );
    if (acepta) {
      event.currentTarget.submit();
    }
  }

  const valido = fecha !== "" && hora !== "" && motivo.trim().length >= 3;

  return (
    <form action={reprogramarAdmin} onSubmit={confirmarEnvio} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <p className="text-xs text-ink-700">
        <span className="font-semibold text-ink-900">{servicio}</span> · {duracion} min
      </p>
      <label className="text-xs font-semibold text-ink-700" htmlFor="fecha-nueva">
        Nueva fecha
      </label>
      <input
        id="fecha-nueva"
        name="fecha_nueva"
        type="date"
        required
        value={fecha}
        onChange={(e) => {
          setFecha(e.target.value);
          setHora("");
        }}
        className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={() => void consultar()}
        className="rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-sand-100"
      >
        {estado === "cargando" ? "Consultando..." : "Ver horas disponibles"}
      </button>
      {estado === "error" ? (
        <p role="alert" className="text-xs text-red-800">{error}</p>
      ) : null}
      {estado === "listo" ? (
        horas.length === 0 ? (
          <p className="text-xs text-ink-500">Sin horas libres ese día.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {horas.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHora(h)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  hora === h
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-brand-200 bg-white text-brand-900 hover:bg-brand-50"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        )
      ) : null}
      <input type="hidden" name="hora_nueva" value={hora} />
      <label className="text-xs font-semibold text-ink-700" htmlFor="motivo-reprogramar">
        Motivo del cambio
      </label>
      <textarea
        id="motivo-reprogramar"
        name="motivo"
        required
        minLength={3}
        maxLength={200}
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej: el paciente pidió cambio de horario"
        className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={!valido}
        className="rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reprogramar
      </button>
    </form>
  );
}
