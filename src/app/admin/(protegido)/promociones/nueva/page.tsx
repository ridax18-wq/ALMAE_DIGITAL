import type { Metadata } from "next";
import Link from "next/link";
import { FormularioPromocion } from "@/app/admin/(protegido)/promociones/FormularioPromocion";
import { opcionesImagen } from "@/lib/cms/media";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Nueva promoción",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NuevaPromocionPage() {
  const supabase = createSupabaseServiceClient();
  const [{ data: servicios }, imagenes] = await Promise.all([
    supabase.from("services").select("id, name").order("sort_order"),
    opcionesImagen(),
  ]);

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/promociones" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a promociones
        </Link>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">Nueva promoción</h1>
          <FormularioPromocion
            promocion={null}
            servicios={(servicios ?? []).map((s) => ({ id: String(s.id), name: s.name }))}
            imagenes={imagenes}
          />
        </div>
      </div>
    </main>
  );
}
