import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioPromocion } from "@/app/admin/(protegido)/promociones/FormularioPromocion";
import { opcionesImagen } from "@/lib/cms/media";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Editar promoción",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const [{ data: promo }, { data: servicios }, imagenes] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "id, code, kind, value, service_id, valid_from, valid_to, max_uses, image_media_id, sort_order, active, published",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("services").select("id, name").order("sort_order"),
    opcionesImagen(),
  ]);

  if (!promo) notFound();

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/admin/promociones" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a promociones
        </Link>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">Editar promoción</h1>
          <FormularioPromocion
            promocion={{
              id: String(promo.id),
              code: promo.code,
              kind: promo.kind as "fixed" | "percent",
              value: Number(promo.value),
              service_id: promo.service_id,
              valid_from: promo.valid_from,
              valid_to: promo.valid_to,
              max_uses: promo.max_uses,
              image_media_id: promo.image_media_id,
              sort_order: promo.sort_order ?? 0,
              active: promo.active,
              published: promo.published,
            }}
            servicios={(servicios ?? []).map((s) => ({ id: String(s.id), name: s.name }))}
            imagenes={imagenes}
          />
        </div>
      </div>
    </main>
  );
}
