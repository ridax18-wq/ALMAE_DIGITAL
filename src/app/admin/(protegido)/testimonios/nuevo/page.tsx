import type { Metadata } from "next";
import Link from "next/link";
import { FormularioTestimonio } from "@/app/admin/(protegido)/testimonios/FormularioTestimonio";
import { opcionesImagen } from "@/lib/cms/media";

export const metadata: Metadata = {
  title: "Nuevo testimonio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NuevoTestimonioPage() {
  const imagenes = await opcionesImagen();
  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/testimonios" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a testimonios
        </Link>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">Nuevo testimonio</h1>
          <FormularioTestimonio testimonio={null} imagenes={imagenes} />
        </div>
      </div>
    </main>
  );
}
