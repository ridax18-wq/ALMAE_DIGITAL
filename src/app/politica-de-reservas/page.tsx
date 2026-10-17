import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Política de reservas",
  description:
    "Cómo funcionan las reservas de ALMAE: reserva temporal, adelanto, confirmación, reprogramación, cancelación e inasistencia.",
};

export default function PoliticaReservasPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Política de reservas"
        description="Reglas claras para que reservar sea seguro y predecible para ti y para nosotros."
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container className="max-w-3xl">
          <div className="space-y-8 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
            <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              Borrador con valores provisionales (datos de demostración). Los
              plazos definitivos se confirmarán con la política aprobada por el
              propietario de ALMAE.
            </p>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                1. Reserva temporal
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Al elegir servicio, fecha y hora, el sistema reserva ese horario
                para ti durante <strong>10 minutos</strong> mientras completas
                el pago del adelanto. Si no se completa en ese plazo, el
                horario vuelve a estar disponible para otras personas.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                2. Confirmación con adelanto
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Tu cita queda <strong>confirmada</strong> únicamente cuando el
                pago del adelanto está acreditado y validado por el sistema.
                Hasta ese momento, la cita no está asegurada, incluso si ya
                cerraste el navegador.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                3. Pago acreditado después del plazo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Si tu pago se acredita después de que la reserva temporal haya
                expirado y el horario fue tomado por otra persona, el sistema
                no confirmará automáticamente esa cita: tu pago quedará
                registrado y nos contactaremos contigo para reprogramar o
                reembolsarte, conforme al medio de pago.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                4. Reprogramación
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Puedes reprogramar desde el enlace de tu reserva hasta{" "}
                <strong>24 horas</strong> antes de la cita (valor provisional,
                sujeto a confirmación), eligiendo otro horario disponible. Tu
                adelanto viaja contigo a la nueva cita.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                5. Cancelación
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Puedes cancelar hasta <strong>24 horas</strong> antes de la cita
                (valor provisional, sujeto a confirmación). El adelanto se
                reembolsa conforme al medio de pago usado. Cancelaciones con
                menos anticipación pueden no generar reembolso, según el plazo
                publicado en cada servicio.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                6. Inasistencia (no-show)
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Si no asistes a tu cita confirmada sin avisar, el adelanto no es
                reembolsable y la cita se registra como inasistencia.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                7. Puntualidad
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Te pedimos llegar a tiempo para respetar la agenda de las demás
                personas. Llegadas muy tarde pueden acortar tu sesión o
                requerir reprogramar, según el caso.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                8. Casos particulares
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Cualquier situación no cubierta aquí (fallas técnicas, fuerza
                mayor, pagos pendientes de aclaración) se resolverá con
                comunicación directa por WhatsApp, buscando siempre la solución
                más razonable para ambas partes.
              </p>
            </section>
          </div>
        </Container>
      </main>
    </>
  );
}
