import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CambiarContraseña } from "@/app/admin/recuperar/CambiarContraseña";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) {
    redirect("/admin/login?sesion=expirada");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-16">
        <div className="max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Enlace inválido o expirado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            El enlace de recuperación ya no es válido. Solicita uno nuevo desde
            la pantalla de acceso.
          </p>
          <a
            href="/admin/login"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Volver a iniciar sesión
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-8 shadow-xs">
        <p className="font-display text-xl font-extrabold tracking-tight text-brand-800">
          ALMAE · Nueva contraseña
        </p>
        <p className="mt-2 mb-6 text-center text-sm text-ink-500">
          Define tu nueva contraseña para continuar
        </p>
        <CambiarContraseña />
      </div>
    </main>
  );
}
