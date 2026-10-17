import { InfoIcon } from "@/components/icons";
import { Container } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type PendingPageProps = {
  title: string;
  phase: string;
  message: string;
  backLabel?: string;
  backHref?: string;
};

export function PendingPage({
  title,
  phase,
  message,
  backLabel = "Volver al inicio",
  backHref = "/",
}: PendingPageProps) {
  const whatsappUrl = buildWhatsAppUrl("cita");

  return (
    <main className="bg-sand-50 py-16 sm:py-24">
      <Container className="max-w-xl">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand-50">
            <InfoIcon className="size-7 text-brand-700" />
          </span>
          <p className="mb-2 text-xs font-bold tracking-[0.18em] uppercase text-brand-600">
            En construcción · {phase}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            {message}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {whatsappUrl ? (
              <Button href={whatsappUrl} variant="whatsapp" external>
                Consultar por WhatsApp
              </Button>
            ) : null}
            <Button href={backHref} variant="secondary">
              {backLabel}
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
