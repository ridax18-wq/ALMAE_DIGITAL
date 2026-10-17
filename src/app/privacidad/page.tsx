import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Privacidad",
  description:
    "Cómo ALMAE recopila, usa y protege tus datos personales conforme a la Ley N.° 29733 de Protección de Datos Personales del Perú.",
};

export default function PrivacidadPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Política de privacidad"
        description="Tu información personal se trata con respeto y transparencia, conforme a la Ley N.° 29733 (Protección de Datos Personales) y su reglamento vigente en el Perú."
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container className="max-w-3xl">
          <div className="space-y-8 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
            <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              Borrador para revisión final con asesor legal antes de la
              publicación en producción. Los datos de contacto mostrados son de
              demostración hasta confirmar los oficiales.
            </p>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                1. Datos que recopilamos
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Solo lo mínimo necesario para gestionar tu cita: nombre,
                número de teléfono, correo electrónico (opcional) y los detalles
                de la reserva (servicio, fecha, hora). No solicitamos historia
                clínica, diagnósticos ni antecedentes médicos en el proceso de
                reserva.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                2. Para qué los usamos
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-700">
                <li>Crear y gestionar tu reserva de cita.</li>
                <li>Procesar el adelanto que confirma tu cita.</li>
                <li>Comunicarnos contigo sobre tu cita (confirmación, cambios).</li>
                <li>
                  Enviarte novedades o promociones <strong>únicamente</strong> si
                  autorizaste expresamente ese contacto comercial.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                3. Tu consentimiento es diferenciado
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Autorizarnos a gestionar tu cita no implica autorizar mensajes
                comerciales. Si aceptas recibir novedades, ese consentimiento
                queda registrado con fecha y puedes retirarlo en cualquier
                momento sin perder el derecho a reservar.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                4. Con quién compartimos tus datos
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Solo con los proveedores tecnológicos estrictamente necesarios
                para operar el servicio (alojamiento de datos y procesamiento de
                pagos). No vendemos ni cedemos tus datos a terceros con fines
                publicitarios.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                5. Derechos ARCO
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Puedes solicitar el acceso, rectificación, cancelación u
                oposición respecto de tus datos personales escribiéndonos por
                WhatsApp. Atenderemos tu solicitud conforme a la ley vigente.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                6. Seguridad
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Aplicamos medidas de seguridad técnicas y organizativas: cifrado
                en tránsito (HTTPS), controles de acceso al sistema, y
                protección especial para la información de reservas. No
                almacenamos números completos de tarjetas ni códigos CVV.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                7. Conservación
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Conservamos los datos de reservas y pagos por el tiempo
                necesario para fines contables y legales, y luego los
                eliminamos o anonimizamos.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-ink-900">
                8. Actualizaciones
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Si esta política cambia, publicaremos la versión actualizada en
                esta página con su fecha de vigencia.
              </p>
            </section>
          </div>
        </Container>
      </main>
    </>
  );
}
