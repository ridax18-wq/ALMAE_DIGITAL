# AGENTS.md — Reglas de trabajo para agentes de IA y colaboradores

Este documento define las reglas obligatorias para cualquier agente o persona que trabaje en el repositorio **ALMAE DIGITAL**.

## 1. Contexto del producto

- Cliente: ALMAE — fisioterapia, rehabilitación y bienestar (Lima, Perú).
- Un (1) profesional. Atención presencial. Moneda **PEN**. Zona horaria **America/Lima**.
- Objetivo: convertir prospectos de grupos de WhatsApp de condominios en pacientes con reservas confirmadas por adelanto.
- El **paciente no crea contraseña** para reservar. El **administrador sí** requiere autenticación segura (Supabase Auth).

## 2. Flujo de fases (obligatorio)

Trabajar **una fase por intervención**, del roadmap en [`docs/roadmap.md`](docs/roadmap.md). Para cada fase:

1. Explicar objetivo.
2. Mostrar archivos afectados.
3. Implementar.
4. Ejecutar validaciones (lint, typecheck, tests relevantes).
5. Corregir errores.
6. Documentar pruebas realizadas en [`docs/progress.md`](docs/progress.md).
7. Enumerar pendientes.
8. Indicar criterios de aceptación y **solicitar autorización** para la siguiente fase.

Nunca ejecutar todas las fases en una sola intervención. Nunca desplegar a producción ni ejecutar migraciones contra bases de datos de producción sin autorización explícita del propietario.

## 3. Restricciones de seguridad (innegociables)

- **Nunca** escribir secretos, claves API o credenciales en archivos versionados ni en el chat. Solo `.env` local y gestor de secretos del proveedor de despliegue.
- `SUPABASE_SERVICE_ROLE_KEY` y claves secretas de pago **solo** en código server-side (`lib/services`, route handlers). Jamás en componentes cliente ni en `NEXT_PUBLIC_*`.
- Nunca confiar en datos del navegador: disponibilidad, precios, montos de pago y estados se calculan/validan **siempre en el servidor**.
- Nunca confirmar una cita si el pago no está acreditado y validado (ver [`docs/payments.md`](docs/payments.md)).
- Nunca exponer datos de pacientes de terceros. Los endpoints públicos de consulta de reserva usan **tokens de alta entropía** (≥128 bits) con caducidad.
- Validar toda entrada con Zod, también en el servidor. Aplicar rate limiting en rutas públicas mutantes.
- No almacenar números completos de tarjeta ni CVV, jamás.
- Los endpoints de webhook deben validar autenticidad e integridad según el mecanismo vigente del proveedor y ser idempotentes.

## 4. Datos de demostración

- **No inventar** precios oficiales, teléfonos, direcciones completas, credenciales, testimonios ni identidad visual definitiva.
- Todo dato de demo se marca claramente (sufijo `_DEMO`, banner "datos de demostración" en desarrollo).
- Testimonios: solo placeholders rotulados "ejemplo" o sección deshabilitada hasta tener consentimiento real.
- Fotografías: no representar falsamente al personal ni al consultorio. Placeholders identificados.

## 5. Código

- TypeScript **estricto**. Sin `any` salvo justificación escrita.
- Next.js **App Router**; componentes servidor por defecto, `"use client"` solo cuando se necesita interacción.
- Tailwind: colores centralizados en variables de diseño (tokens), nunca hex sueltos.
- Comentarios solo si se piden explícitamente; el código debe autoexplicarse.
- Estilo del código existente manda. Antes de escribir, leer el código circundante.
- Mensajería de UI en **español (es-PE)**, tono cercano y profesional.
- Formato de montos: `S/ 1.234,56` (PEN, según locale es-PE); fechas y horas siempre en `America/Lima`.

## 6. Base de datos

- Toda cambio de esquema va en **migraciones SQL versionadas** (`supabase/migrations/NNNN_nombre.sql`). Nunca aplicar cambios solo desde el dashboard en producción.
- Identificadores internos UUID. Claves foráneas e índices obligatorios. `timestamptz` para todas las fechas.
- Reservas superpuestas se impiden **en la base de datos** (restricción de exclusión + función transaccional), no solo en el navegador (ver [`docs/database.md`](docs/database.md)).
- RLS activada en todas las tablas; tablas privadas sin políticas públicas. Anon solo puede leer lo estrictamente necesario (servicios activos, disponibilidad).
- Regenerar tipos tras cada migración: `npx supabase gen types typescript`.

## 7. Validaciones antes de cerrar cualquier fase

```bash
npm run lint
npm run typecheck
npm test            # unit (si existen)
npm run test:e2e    # solo en fases que lo declaren
npm run build       # al cierre de cada fase
```

No declarar una fase completa si alguna validación falla. No afirmar pruebas no ejecutadas.

## 8. Git

- Commits por módulo, mensajes concisos en español o inglés consistente, ej. `feat(reservas): motor de disponibilidad server-side`.
- Nunca commitear `.env`, `node_modules`, builds ni secretos (ver `.gitignore`).
- No forzar push, no reescribir historial compartido.

## 9. Ante ambigüedad

- Preguntar al propietario antes de inventar reglas de negocio (precios, políticas, horarios reales).
- Si algo no está definido, implementar con parámetro editable en `business_settings` y valor por defecto documentado.
- Las rutas no implementadas deben existir como página pendiente visible o quedar fuera del build — nunca aparentar funcionalidad completa.
