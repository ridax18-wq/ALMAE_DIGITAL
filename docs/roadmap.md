# Roadmap — ALMAE DIGITAL 1.0

> Regla: **una fase por intervención.** Cada fase termina con validaciones ejecutadas, pruebas documentadas en `progress.md` y autorización del propietario para continuar.

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Auditoría del entorno y planificación | ✅ Completada |
| 1 | Interfaz pública y navegación | ✅ Completada |
| 2 | Supabase, autenticación y datos | ✅ Completada |
| 3 | Motor de disponibilidad y reservas | ✅ Completada |
| 4 | Adelantos simulados + flujo de confirmación | ✅ Completada |
| 5 | Integración real Culqi (sandbox) | ⏳ Pendiente |
| 6 | Panel administrativo y reportes | ⏳ Pendiente |
| 7 | E2E y preparación de despliegue | ⏳ Pendiente |
| 8 | Marketing, promociones y extras | ⏳ Pendiente |

---

## FASE 0 — Auditoría del entorno y planificación ✅

**Objetivo:** conocer el entorno, verificar compatibilidad del stack y dejar la base documental del proyecto.

**Alcance ejecutado:**
- Auditoría del directorio (vacío) y de herramientas: Node 24.21.0, npm 11.19.0, Git 2.55.0.
- Verificación de versiones en el registro npm (next 16.4.2, react 19.3.1, typescript 7.0.2, tailwindcss 4.3.3, supabase-js 2.118.0, zod 4.6.7, vitest 5.0.5, playwright 1.64.1, @opennextjs/cloudflare 1.20.12, wrangler 4.151.1, eslint 10.13.0, prettier 3.9.10, eslint-config-next 16.4.2, @types/node 26.6.5, @typescript/typescript6 6.0.2).
- Verificación de compatibilidad con documentación oficial (Next 16 + TS 7; OpenNext soporta todos los minors de Next 16; riesgo middleware/proxy documentado).
- Generación de: README, AGENTS, .gitignore, .env.example y los 9 documentos de `docs/`.
- Inicialización de repositorio Git.

**Entregables:** ver `progress.md`.

---

## FASE 1 — Interfaz pública y navegación

**Objetivo:** portal público completo, mobile-first, accesible y SEO-friendly, con identidad visual provisional en tokens y datos `_DEMO`.

**Alcance:** inicialización del proyecto Next 16 + TS 7 + Tailwind 4 (npm install con versiones verificadas); layout, header, menú, footer, botón flotante WhatsApp; páginas `/`, `/servicios`, `/servicios/[slug]`, `/nosotros`, `/promociones`, `/contacto`, `/privacidad`, `/terminos`, `/politica-de-reservas`; rutas futuras (`/reservar`, `/reserva/[token]`, `/pagos/resultado`) como páginas pendientes visibles; tokens de color centralizados; `npm run build` verde.

**Criterios de aceptación:** responsive en 375 px/768/1280; contraste AA; navegable por teclado; metadata y OG correctos; sin datos que parezcan oficiales; build sin errores.

---

## FASE 2 — Supabase, autenticación y estructura de datos

**Objetivo:** proyecto Supabase (creado por el propietario), migraciones versionadas del esquema completo, RLS, tipos generados, autenticación admin y login funcional.

**Alcance:** migraciones SQL (tablas, enums, índices, EXCLUDE, RLS, seeds `_DEMO`); `@supabase/ssr`; `/admin/login`; layout de `/admin` protegido por sesión; smoke test de despliegue a Cloudflare con Supabase conectado (R1).

**Criterios de aceptación:** migraciones aplican local y en proyecto; RLS verificada con supabase-js (anon no lee datos privados); admin inicia sesión y `/admin` protegido funciona; tipos regenerados.

---

## FASE 3 — Motor de disponibilidad y reservas

**Objetivo:** disponibilidad real server-side y flujo de reserva con hold temporal, sin pagos.

**Alcance:** `lib/services/availability.ts` (puro + tests Vitest: feriados, bloqueos, gap, prep, zona horaria); RPC transaccional `crear_reserva_con_hold()`; API `/api/availability` y `/api/reservas` con Zod + rate limit; página `/reservar` (wizard: servicio → fecha → hora → datos → hold); página `/reserva/[token]` (ver estado, cancelar/solicitar reprogramación manual); expiración de holds (job/CRON); estados HELD→EXPIRED.

**Criterios de aceptación:** no hay superposiciones (prueba de concurrencia contra la RPC); hold expira y libera slot; disponibilidad coincide con reglas de negocio; reproducción sin duplicidad.

---

## FASE 4 — Adelantos simulados + flujo de confirmación

**Objetivo:** flujo completo de pago con **simulador** (nunca pasarela real), transiciones de estado y pantalla de resultado.

**Alcance:** adaptador mock; `/pagos/resultado`; webhook simulado; idempotencia; estados PENDING_PAYMENT→CONFIRMED; conciliación de pago tardío (RF-S6); pruebas de los 8 escenarios críticos de pagos.

**Criterios de aceptación:** pago aprobado confirma; pago fallido/expirado no confirma; webhooks duplicados no duplican; pago tardío queda en conciliación; simulador imposible en producción (guard).

---

## FASE 5 — Integración real Culqi (sandbox)

**Objetivo:** pasarela real en sandbox con credenciales proporcionadas por el propietario.

**Alcance:** implementación del adaptador Culqi (docs vigentes: API de cargos, webhook y firma); validación de importe/moneda/referencia/estado; resolución de disputas de conciliación; bandeja de pagos en admin mínima.

**Criterios de aceptación:** cobro sandbox aprobado y fallido funcionan; webhook verificado por firma; importe validado contra BD (rechaza manipulación); idempotencia comprobada; autorización explícita del propietario antes de tocar producción.

---

## FASE 6 — Panel administrativo y reportes

**Objetivo:** administración completa y reportes con datos reales.

**Alcance:** dashboard (RF-A13), agenda diaria/semanal/mensual, CRUD servicios/horarios/excepciones, pacientes, pagos manuales, bloqueos, estados permitidos con transiciones validadas, eventos/auditoría visibles, reportes por campaña/origen (RF-A14), export CSV opcional.

**Criterios de aceptación:** todas las pantallas operativas con datos reales; transiciones de estado válidas; indicadores coinciden con datos; sin datos ficticios.

---

## FASE 7 — E2E y preparación del despliegue

**Objetivo:** suite Playwright de los flujos críticos y despliegue a producción ensayado.

**Alcance:** E2E: reservar+pagar (mock), reprogramar, cancelar, hold expirado, admin completo; checklist de seguridad; dominio propio en Cloudflare; variables de entorno en producción; runbook de operación/recuperación; ensayo completo en staging/preview.

**Criterios de aceptación:** e2e verde en CI; despliegue de ensayo probado end-to-end; checklist de seguridad revisado con el propietario.

---

## FASE 8 — Marketing, promociones y extras

**Objetivo:** captación medible y fidelización.

**Alcance:** UTM/campañas en enlaces de condominios; reportes de conversión; promociones con códigos; paquetes de sesiones; testimonios con consentimiento real; WhatsApp Business Platform (evaluación de costos); recordatorios (proveedor oficial, con consentimiento).

**Criterios de aceptación:** reservas registran origen; reportes de conversión visibles; promociones aplicables server-side sin manipulación de precios.

---

## 9. Criterios de aceptación globales del MVP

1. Portal correcto en móvil y escritorio.
2. Servicios administrables.
3. Disponibilidad correcta.
4. Sin reservas duplicadas/superpuestas.
5. Holds expiran correctamente.
6. Pago fallido no confirma cita.
7. Pago aprobado y validado confirma la cita.
8. Webhooks duplicados no duplican pagos.
9. Admin con acceso seguro.
10. Pacientes no ven datos de terceros.
11. Bloqueos de agenda funcionan.
12. Pruebas automatizadas de casos críticos.
13. Proyecto compila sin errores.
14. Despliegue probado.
15. Documentación para operar y recuperar el sistema.
