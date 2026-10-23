import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeafIcon } from "@/components/icons";
import { cerrarSesion } from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { esAdministrador } from "@/lib/services/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAVEGACION = [
  { href: "/admin", label: "Panel de control" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/pacientes", label: "Pacientes" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/contenidos", label: "Contenidos" },
  { href: "/admin/multimedia", label: "Multimedia" },
  { href: "/admin/promociones", label: "Promociones" },
  { href: "/admin/testimonios", label: "Testimonios" },
  { href: "/admin/ubicacion", label: "Ubicación" },
  { href: "/admin/contacto", label: "Contacto" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
        <div className="max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <h1 className="font-display text-xl font-bold text-ink-900">
            Configuración pendiente
          </h1>
          <p className="mt-2 text-sm text-ink-700">
            Define las variables de Supabase en el entorno para acceder a la
            administración.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/admin/login");
  }

  const administrador = await esAdministrador(data.user.id);

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-50 border-b border-sand-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800"
          >
            <LeafIcon className="size-5 text-brand-600" />
            ALMAE · Admin
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-700 sm:inline">
              {data.user.email}
            </span>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-sand-100"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Secciones del panel" className="border-t border-sand-200 bg-white">
          <ul className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {NAVEGACION.map((seccion) => (
              <li key={seccion.href}>
                <Link
                  href={seccion.href}
                  className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                >
                  {seccion.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {!administrador ? (
        <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Tu sesión está autenticada, pero no figura en la lista de
            administradores habilitados. Solicita al dueño agregar tu perfil en{" "}
            <code>admin_profiles</code>.
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
