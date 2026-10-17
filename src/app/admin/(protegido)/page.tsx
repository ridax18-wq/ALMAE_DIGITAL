import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { InfoIcon } from "@/components/icons";
import { obtenerPerfilAdministrador } from "@/lib/services/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Panel administrativo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const perfil = data.user
    ? await obtenerPerfilAdministrador(data.user.id)
    : null;

  return (
    <main className="py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-xs">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Panel administrativo
          </h1>
          <p className="mt-2 text-sm text-ink-700">
            Sesión activa: <strong>{data.user?.email}</strong>
            {perfil ? (
              <>
                {" "}· Rol: <strong>{perfil.role}</strong>
                {perfil.display_name ? ` · ${perfil.display_name}` : null}
              </>
            ) : null}
          </p>
          <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-8 text-center">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white">
              <InfoIcon className="size-7 text-brand-700" />
            </span>
            <p className="mb-1 text-xs font-bold tracking-[0.18em] uppercase text-brand-600">
              En construcción · Fase 6
            </p>
            <h2 className="font-display text-xl font-bold text-ink-900">
              Dashboard en preparación
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
              El panel completo (agenda, reservas, pacientes, pagos y reportes)
              se implementará al finalizar el motor de reservas. No se muestra
              ningún dato de demostración.
            </p>
            <div className="mt-6 flex justify-center">
              <Button href="/" variant="secondary">
                Volver al sitio público
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
