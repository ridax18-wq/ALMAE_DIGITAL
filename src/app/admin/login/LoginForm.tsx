"use client";

import { useActionState } from "react";
import { iniciarSesion, solicitarRecuperacion, type EstadoLogin } from "@/app/admin/actions";

const estadoInicial: EstadoLogin = { error: null };

export function LoginForm() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, estadoInicial);
  const [estadoRecuperar, accionRecuperar, enviandoRecuperar] = useActionState(
    solicitarRecuperacion,
    estadoInicial,
  );

  if (estadoRecuperar.error === null && estadoRecuperar !== estadoInicial) {
    return (
      <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        Si el correo está registrado, enviamos las instrucciones para crear una
        nueva contraseña. Revisa tu bandeja de entrada.
      </p>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-900">
          Correo electrónico
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
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-900">
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
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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

      <details className="mt-1">
        <summary className="cursor-pointer text-center text-xs font-semibold text-brand-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </summary>
        <form action={accionRecuperar} className="mt-3 flex flex-col gap-2 rounded-xl bg-sand-100 p-3">
          <label htmlFor="email-recuperar" className="text-xs font-semibold text-ink-700">
            Correo electrónico registrado
          </label>
          <input
            id="email-recuperar"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
          />
          {estadoRecuperar.error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {estadoRecuperar.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={enviandoRecuperar}
            className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {enviandoRecuperar ? "Enviando…" : "Enviar instrucciones"}
          </button>
        </form>
      </details>
    </form>
  );
}
