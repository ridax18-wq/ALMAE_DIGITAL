import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioTestimonio } from "@/app/admin/(protegido)/testimonios/FormularioTestimonio";
import { opcionesImagen } from "@/lib/cms/media";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Editar testimonio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditarTestimonioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const [{ data: t }, imagenes] = await Promise.all([
    supabase
      .from("testimonials")
      .select("id, patient_name, quote, rating, media_id, patient_consent, status")
      .eq("id", id)
      .maybeSingle(),
    opcionesImagen(),
  ]);

  if (!t) notFound();

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/testimonios" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a testimonios
        </Link>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">Editar testimonio</h1>
          <FormularioTestimonio
            testimonio={{
              id: String(t.id),
              patient_name: t.patient_name,
              quote: t.quote,
              rating: t.rating,
              media_id: t.media_id,
              patient_consent: t.patient_consent,
              status: t.status,
            }}
            imagenes={imagenes}
          />
        </div>
      </div>
    </main>
  );
}
