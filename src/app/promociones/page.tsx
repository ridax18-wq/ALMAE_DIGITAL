import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { InfoIcon } from "@/components/icons";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Promociones",
  description:
    "Promociones vigentes de ALMAE. Cuando existan promociones activas, las publicaremos aquí y por WhatsApp.",
};

export default function PromocionesPage() {
  const whatsappUrl = buildWhatsAppUrl("paquetes");

  return (
    <>
      <PageHero
        eyebrow="Promociones"
        title="Promociones vigentes"
        description="Aquí publicaremos los beneficios y paquetes activos de ALMAE. Por ahora no hay promociones publicadas."
      />
      <main className="bg-sand-50 py-14 sm:py-20">
        <Container className="max-w-2xl">
          <div className="rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
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
        </Container>
      </main>
    </>
  );
}
