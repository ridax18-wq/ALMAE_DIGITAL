# Requisitos — ALMAE DIGITAL 1.0

> Fuente: brief del propietario. Los datos de demostración se marcan `_DEMO`. Nada de esto se inventa como "oficial".

## 1. Actores

| Actor | Descripción | Autenticación |
|---|---|---|
| Prospecto/Paciente | Llega desde grupos de WhatsApp de condominios | Sin contraseña; consulta por token de reserva |
| Administrador | Dueño de ALMAE (1 profesional) | Supabase Auth (email + password), MFA recomendado |
| Proveedor de pagos | Culqi (sandbox → producción) | Webhooks con firma |
| Sistema (CRON) | Expiración de holds, reportes | Secreto `CRON_SECRET` |

## 2. Requisitos funcionales — Paciente (RF-P)

| ID | Requisito |
|---|---|
| RF-P1 | Ver catálogo de servicios activos con duración, precio y adelanto (publicados) |
| RF-P2 | Ver detalle de servicio: descripción, instrucciones previas, imagen |
| RF-P3 | Ver días/horas disponibles reales (calculadas server-side, `America/Lima`) |
| RF-P4 | Crear reserva: servicio → fecha → hora → datos mínimos de contacto → hold temporal |
| RF-P5 | Datos mínimos: nombre, teléfono (WhatsApp), email opcional, consentimiento de contacto |
| RF-P6 | Pagar adelanto con tarjeta (Culqi) dentro del tiempo del hold |
| RF-P7 | Recibir confirmación clara (pantalla de estado + enlace persistente con token) |
| RF-P8 | Consultar condiciones de su cita desde el enlace/token |
| RF-P9 | Solicitar reprogramación desde su reserva (sujeta a disponibilidad y política) |
| RF-P10 | Cancelar su reserva conforme a la política publicada |
| RF-P11 | Contactar a ALMAE por WhatsApp con mensaje prellenado contextual |
| RF-P12 | Ver promociones vigentes (si existen) |
| RF-P13 | Ver políticas: privacidad, términos, política de reservas |

## 3. Requisitos funcionales — Administrador (RF-A)

| ID | Requisito |
|---|---|
| RF-A1 | Iniciar sesión seguro; sesiones por cookie httpOnly; cierre de sesión |
| RF-A2 | CRUD de servicios (nombre, duración, precio, adelanto, activo/inactivo, imagen, instrucciones, prep time) |
| RF-A3 | Configurar horario laboral semanal y descansos |
| RF-A4 | Crear excepciones: feriados, vacaciones, bloqueos por fecha/hora |
| RF-A5 | Configurar buffer/gap entre citas y TTL de hold |
| RF-A6 | Ver agenda diaria/semanal/mensual con estados |
| RF-A7 | Ver/editar reservas; cambiar estados permitidos; registrar no-show |
| RF-A8 | Gestionar pagos: ver estado, registrar pago manual (p. ej. efectivo/Yape) |
| RF-A9 | Conciliación: lista de pagos sin reserva vigente; reprogramar o reembolsar |
| RF-A10 | Gestionar pacientes (búsqueda, historial de citas, notas operativas — NO clínicas) |
| RF-A11 | Gestionar paquetes de sesiones (fase 8) |
| RF-A12 | Gestionar promociones (código, descuento, vigencia) |
| RF-A13 | Dashboard con indicadores: citas de hoy, confirmadas, pendientes, canceladas, pacientes nuevos/recurrentes, adelantos cobrados, saldos pendientes, ingresos mensuales, tasa de no-show, reservas por origen |
| RF-A14 | Reportes por origen comercial/campaña (UTM): visitas, consultas, reservas iniciadas, pagadas, conversión, ingresos atribuibles |
| RF-A15 | Exportar CSV de reportes (opcional MVP) |

## 4. Requisitos funcionales — Sistema (RF-S)

| ID | Requisito |
|---|---|
| RF-S1 | Motor de disponibilidad con: horario laboral, duración+prep, descansos, feriados, bloqueos, citas existentes, holds vigentes, gap, zona horaria |
| RF-S2 | Prohibir reservas superpuestas a nivel de BD (EXCLUDE + RPC transaccional) |
| RF-S3 | Estados de reserva: HELD, PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, EXPIRED, NO_SHOW, REFUND_PENDING, REFUNDED |
| RF-S4 | Estados de pago independientes: CREATED, PENDING, SUCCEEDED, FAILED, EXPIRED, REFUND_PENDING, REFUNDED, RECONCILIATION |
| RF-S5 | Hold expira a los `BOOKING_HOLD_TTL_MINUTES` (10 por defecto); su expiración libera el slot |
| RF-S6 | Pago acreditado tras expiración del hold → `RECONCILIATION`, nunca auto-confirmar |
| RF-S7 | Confirmación de cita solo cuando el pago está `SUCCEEDED` y validado server-side |
| RF-S8 | Webhooks idempotentes (dedupe por id externo) con validación de autenticidad |
| RF-S9 | Reprogramación sin duplicidad (migra la misma fila, historial en eventos) |
| RF-S10 | Auditoría: eventos de reserva, eventos de pago, audit_logs de acciones admin |
| RF-S11 | Origen comercial (UTM/campaña) persistido en la reserva cuando sea legítimo |

## 5. Requisitos no funcionales (RNF)

| ID | Requisito |
|---|---|
| RNF-1 | Mobile-first (~375 px); usable en escritorio |
| RNF-2 | Rendimiento: LCP < 2.5 s en 4G; JS de cliente mínimo (RSC) |
| RNF-3 | Accesibilidad: contraste AA, foco visible, teclado, etiquetas semánticas, estados de carga y error comprensibles |
| RNF-4 | SEO: metadata por página, sitemap, robots, Open Graph para compartir en WhatsApp |
| RNF-5 | Seguridad: ver [`docs/security.md`](security.md) |
| RNF-6 | Escalable a N profesionales sin rediseño (esquema ya lo considera) |
| RNF-7 | Operable en horario no laboral: reportes diarios claros |
| RNF-8 | Moneda PEN, formato `S/ 1.234,56` (es-PE); fechas en `America/Lima` |
| RNF-9 | Tolerancia a conexión inestable (mensajes de reintento, sin doble cobro) |

## 6. Fuera de alcance del MVP

- Historia clínica electrónica, diagnóstico, consentimientos firmados (fase futura).
- Recordatorios automáticos por WhatsApp (fase 8, con proveedor oficial y consentimiento).
- Multi-profesional (el esquema lo soporta, la UI no).
- App móvil nativa.
- Pagos con Yape/Plin automáticos (pago manual con comprobante en admin, como fallback).
- Facturación electrónica SUNAT (fase futura; se reserva `payments` para conciliar).

## 7. Datos de demostración (política)

- Precios, teléfono, dirección, testimonios, fotos y branding: **placeholders marcados `_DEMO`**.
- UI muestra banner "datos de demostración" en desarrollo.
- Dashboard jamás muestra datos ficticios; sin datos reales muestra ceros/estado vacío.

## 8. Criterios de aceptación del MVP

Ver `docs/roadmap.md` §9 y la lista del brief (criterios 1–15). Resumen operativo:

1. Portal correcto en móvil/escritorio; servicios administrables.
2. Disponibilidad correcta; sin reservas duplicadas ni superpuestas (BD).
3. Holds expiran; pago fallido no confirma; pago acreditado confirma.
4. Webhooks duplicados no duplican pagos.
5. Admin con acceso seguro; pacientes sin acceso a datos de terceros.
6. Bloqueos de agenda funcionan.
7. Pruebas automatizadas de casos críticos; build sin errores.
8. Despliegue probado; documentación de operación y recuperación.
