"use client";

import { useFormStatus } from "react-dom";

export function BotonConfirmar({ habilitado }: { habilitado: boolean }) {
  const { pending } = useFormStatus();
  const deshabilitado = !habilitado || pending;

  return (
    <button
      type="submit"
      disabled={deshabilitado}
      aria-disabled={deshabilitado}
      className="rounded-lg bg-brand-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Confirmando…" : habilitado ? "Confirmar cita" : "Falta adelanto verificado"}
    </button>
  );
}
