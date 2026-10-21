"use client";

import { useActionState } from "react";
import { actualizarContraseña, type EstadoLogin } from "@/app/admin/actions";

const estadoInicial: EstadoLogin = { error: null };

export function CambiarContraseña() {
  const [estado, accion, enviando] = useActionState(actualizarContraseña, estadoInicial);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-900">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      {estado.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {estado.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
