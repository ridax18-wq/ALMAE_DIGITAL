import type { Metadata } from "next";
import Link from "next/link";
import { LeafIcon } from "@/components/icons";
import { LoginForm } from "@/app/admin/login/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Acceso administrativo",
  robots: { index: false, follow: false },
};

const MENSAJES: Record<string, { texto: string; clases: string }> = {
  expirada: {
    texto: "Tu sesión expiró. Vuelve a iniciar sesión.",
    clases: "border-amber-200 bg-amber-50 text-amber-900",
  },
  actualizada: {
    texto: "Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.",
    clases: "border-green-200 bg-green-50 text-green-900",
  },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sesion?: string; actualizada?: string }>;
}) {
  const { sesion, actualizada } = await searchParams;
  const mensaje =
    (sesion && MENSAJES.expirada) ?? (actualizada ? MENSAJES.actualizada : null);

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand-50">
            <LeafIcon className="size-7 text-brand-700" />
          </span>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Configuración pendiente
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            Las variables de Supabase (
            <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            y{" "}
            <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            ) no están configuradas. Defínelas en <code>.env.local</code> para
            habilitar el acceso.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-700/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-8 shadow-xs">
        <p className="flex items-center justify-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand-800">
          <LeafIcon className="size-6 text-brand-600" />
          ALMAE · Administración
        </p>
        <p className="mt-2 mb-6 text-center text-sm text-ink-500">
          Acceso exclusivo para el administrador
        </p>
        {mensaje ? (
          <p
            role="status"
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${mensaje.clases}`}
          >
            {mensaje.texto}
          </p>
        ) : null}
        <LoginForm />
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            Entorno local: cuenta demo <strong>admin@almae.demo</strong> /
            <strong>DemoAlmae2026</strong>. No usar en producción.
          </p>
        ) : null}
      </div>
    </main>
  );
}
