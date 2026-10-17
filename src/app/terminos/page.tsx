import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de uso de la plataforma de reservas y pagos de ALMAE (fisioterapia y rehabilitación, Lima).",
};

export default function TerminosPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Términos y condiciones"
        description="Condiciones de uso de la plataforma y de los servicios de ALMAE. Al usar el sitio y reservar una cita, las aceptas."
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container className="max-w-3xl">
          <div className="space-y-8 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
            <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              Borrador para revisión final con asesor legal antes de la
              publicación en producción.
            </p>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                1. Sobre el servicio
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                ALMAE ofrece servicios de fisioterapia, rehabilitación y
                bienestar de forma presencial en Lima, Perú. La plataforma web
                permite consultar servicios, disponibilidad y realizar reservas
                con pago de adelanto.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                2. Reservas y adelanto
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-700">
                <li>
                  Una cita queda confirmada solo cuando el adelanto exigido
                  está acreditado y validado por el sistema.
                </li>
                <li>
                  El horario elegido queda reservado temporalmente mientras se
                  completa el pago (plazo indicado en la política de reservas).
                </li>
                <li>
                  Los precios, montos y condiciones vigentes son los publicados
                  al momento de la reserva.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                3. Cancelaciones y reprogramaciones
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Se rigen por la{" "}
                <a
                  href="/politica-de-reservas"
                  className="font-semibold text-brand-700 underline underline-offset-2"
                >
                  política de reservas
                </a>
                , que forma parte de estos términos.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                4. Uso adecuado de la plataforma
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Debes proporcionar datos veraces de contacto y usar la
                plataforma de buena fe. Nos reservamos el derecho de cancelar
                reservas derivadas de uso abusivo o datos falsos.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                5. Alcance del servicio
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                La fisioterapia no sustituye la atención médica. Si tu
                condición requiere evaluación médica, te orientaremos
                oportunamente hacia el profesional indicado.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                6. Responsabilidad
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                La plataforma se ofrece “tal cual”. No respondemos por
                indisponibilidad temporales por causas ajenas, sin perjuicio de
                reprogramar o reembolsar el adelanto de las citas afectadas
                conforme a la política de reservas.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                7. Cambios
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Podemos actualizar estos términos; la versión vigente será la
                publicada en esta página al momento de tu reserva.
              </p>
            </section>
          </div>
        </Container>
      </main>
    </>
  );
}
