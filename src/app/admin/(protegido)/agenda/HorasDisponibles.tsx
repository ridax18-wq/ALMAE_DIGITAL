"use client";

import { useState } from "react";
import { consultarHorariosAdmin } from "@/app/admin/(protegido)/agenda/actions";

export function HorasDisponibles() {
  const [horas, setHoras] = useState<string[]>([]);
  const [estado, setEstado] = useState<"inactivo" | "cargando" | "listo" | "error">("inactivo");
  const [error, setError] = useState("");

  async function consultar(): Promise<void> {
    const variante = document.getElementById("adm-variant") as HTMLSelectElement | null;
    const fecha = document.getElementById("adm-fecha") as HTMLInputElement | null;
    if (!variante?.value || !fecha?.value) {
      setEstado("error");
      setError("Elige servicio y fecha primero.");
      return;
    }
    setEstado("cargando");
    const datos = new FormData();
    datos.set("variant_id", variante.value);
    datos.set("fecha", fecha.value);
    const resultado = await consultarHorariosAdmin(datos);
    if (resultado.ok) {
      setHoras(resultado.horas);
      setEstado("listo");
    } else {
      setError(resultado.error);
      setEstado("error");
    }
  }

  function elegir(hora: string): void {
    const campo = document.getElementById("adm-hora") as HTMLInputElement | null;
    if (campo) campo.value = hora;
  }

  return (
    <div className="rounded-lg border border-sand-200 bg-sand-50 p-2.5">
      <button
        type="button"
        onClick={() => void consultar()}
        className="rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-sand-100"
      >
        {estado === "cargando" ? "Consultando..." : "Ver horas disponibles"}
      </button>
      {estado === "error" ? (
        <p role="alert" className="mt-2 text-xs text-red-800">{error}</p>
      ) : null}
      {estado === "listo" ? (
        horas.length === 0 ? (
          <p className="mt-2 text-xs text-ink-500">Sin horas libres ese día.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {horas.map((hora) => (
              <button
                key={hora}
                type="button"
                onClick={() => elegir(hora)}
                className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-900 hover:bg-brand-50"
              >
                {hora}
              </button>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
