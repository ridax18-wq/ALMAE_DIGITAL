import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { InfoIcon } from "@/components/icons";
import { urlPublicaMedia } from "@/lib/cms/media";
import { formatPen } from "@/lib/format";
import { esPromocionVigente } from "@/lib/services/promociones-publicas";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { obtenerConfiguracionPublica } from "@/lib/cms/config-publica";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Promociones",
  description:
    "Promociones vigentes de ALMAE. Cuando existan promociones activas, las publicaremos aquí y por WhatsApp.",
};

export const dynamic = "force-dynamic";

function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type PromocionPublica = {
  id: string;
  code: string;
  kind: string;
  value: number;
  valid_from: string | null;
  valid_to: string | null;
  service_id: string | null;
  media: { storage_path: string } | { storage_path: string }[] | null;
  servicio_nombre?: string | null;
};

function fechaLima(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export default async function PromocionesPage() {
  const config = await obtenerConfiguracionPublica();
  const whatsappUrl = buildWhatsAppUrl("paquetes", undefined, {
    numero: config.whatsapp || undefined,
  });
  const hoy = hoyLima();
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("promotions")
    .select(
      "id, code, kind, value, valid_from, valid_to, service_id, media:media_assets!promotions_image_media_id_fkey(storage_path)",
    )
    .eq("active", true)
    .eq("published", true)
    .order("sort_order");

  const vigentes: PromocionPublica[] = (data ?? []).filter((p) =>
    esPromocionVigente({ valid_from: p.valid_from, valid_to: p.valid_to }, hoy),
  );

  const idsServicio = vigentes.map((p) => p.service_id).filter(Boolean) as string[];
  let nombres = new Map<string, string>();
  if (idsServicio.length > 0) {
    const { data: servicios } = await supabase
      .from("services")
      .select("id, name")
      .in("id", idsServicio);
    nombres = new Map((servicios ?? []).map((s) => [String(s.id), s.name]));
  }

  return (
    <>
      <PageHero
        eyebrow="Promociones"
        title="Promociones vigentes"
        description={
          vigentes.length > 0
            ? "Estos son los beneficios activos de ALMAE en este momento."
            : "Cuando existan promociones activas, las publicaremos aquí y por WhatsApp."
        }
      />
      <main className="bg-sand-50 py-14 sm:py-20">
        <Container>
          {vigentes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vigentes.map((promo) => {
                const mediaPath = Array.isArray(promo.media)
                  ? promo.media[0]?.storage_path
                  : promo.media?.storage_path;
                const descuento =
                  promo.kind === "percent"
                    ? `${promo.value}% de descuento`
                    : `${formatPen(Math.round(Number(promo.value) * 100))} de descuento`;
                return (
                  <article
                    key={promo.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xs"
                  >
                    {mediaPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlPublicaMedia(mediaPath)}
                        alt={`Promoción ${promo.code}`}
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-brand-50 via-sand-100 to-sage-100">
                        <span className="font-display text-3xl font-extrabold text-brand-300">
                          {promo.code.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h2 className="font-display text-lg font-bold text-ink-900">{promo.code}</h2>
                      <p className="text-base font-semibold text-brand-700">{descuento}</p>
                      <p className="text-sm text-ink-700">
                        {promo.service_id
                          ? `Servicio: ${nombres.get(String(promo.service_id)) ?? "—"}`
                          : "Válido para cualquiera de nuestros servicios"}
                      </p>
                      {promo.valid_from || promo.valid_to ? (
                        <p className="text-xs text-ink-500">
                          {promo.valid_from ? `Desde ${fechaLima(promo.valid_from)}` : ""}
                          {promo.valid_from && promo.valid_to ? " · " : ""}
                          {promo.valid_to ? `Hasta ${fechaLima(promo.valid_to)}` : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-500">Sin fecha de vencimiento</p>
                      )}
                      <div className="mt-auto pt-3">
                        <Button href="/servicios" variant="secondary">
                          Ver servicios
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
              <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand-50">
                <InfoIcon className="size-7 text-brand-700" />
              </span>
              <h2 className="font-display text-xl font-bold text-ink-900">
                Aún no hay promociones publicadas
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                No inventamos promociones: cuando existan beneficios reales y
                vigentes, los encontrarás en esta página. Suscríbete a nuestras
                novedades por WhatsApp o revisa esta sección más adelante.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                {whatsappUrl ? (
                  <Button href={whatsappUrl} variant="whatsapp" external>
                    Consultar paquetes por WhatsApp
                  </Button>
                ) : null}
                <Button href="/servicios" variant="secondary">
                  Ver servicios
                </Button>
              </div>
            </div>
          )}
        </Container>
      </main>
    </>
  );
}
