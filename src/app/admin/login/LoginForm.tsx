"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/app/admin/actions";

const estadoInicial: EstadoLogin = { error: null };

export function LoginForm() {
  const [estado, accionFormulario, enviando] = useActionState(
    iniciarSesion,
    estadoInicial,
  );

  return (
    <form action={accionFormulario} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-semibold text-ink-900"
        >
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-semibold text-ink-900"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      {estado.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {estado.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
