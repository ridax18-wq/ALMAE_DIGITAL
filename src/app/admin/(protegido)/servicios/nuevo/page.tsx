import type { Metadata } from "next";
import Link from "next/link";
import { FormularioServicio } from "@/app/admin/(protegido)/servicios/FormularioServicio";

export const metadata: Metadata = {
  title: "Nuevo servicio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function NuevoServicioPage() {
  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/servicios" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a servicios
        </Link>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Nuevo servicio
          </h1>
          <FormularioServicio servicio={null} />
        </div>
      </div>
    </main>
  );
}
