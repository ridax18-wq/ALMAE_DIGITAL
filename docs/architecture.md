# Arquitectura — ALMAE DIGITAL 1.0

> Última actualización: FASE 0 (2026-10-17). Este documento se mantiene vivo; cada decisión mayor se registra como ADR.

## 1. Visión general

```
┌────────────────────────────────────────────────────────────────────┐
│                        Cliente (móvil primero)                     │
│   Sitio público (paciente)          /admin (dueño/profesional)     │
│   Next.js App Router — RSC + islas cliente mínimas                  │
└──────────────┬───────────────────────────────────┬──────────────────┘
               │ HTTPS                             │ HTTPS + sesión cookie (Supabase Auth)
               ▼                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│              Next.js en Cloudflare Workers (OpenNext)              │
│   Route Handlers /api/*  — única puerta de mutaciones              │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │ lib/services (server-side):                              │     │
│   │  availability · bookings · holds · payments · reports    │     │
│   │  rate-limit · tokens · notifications                     │     │
│   └───────────────┬───────────────────────┬──────────────────┘     │
└───────────────────┼───────────────────────┼────────────────────────┘
                    │ PostgREST (anon/RLS)  │ RPC transaccional (service-role)
                    │ + Auth (admin)        │
                    ▼                       ▼
         ┌──────────────────┐      ┌──────────────────┐
         │    Supabase      │      │  PostgreSQL 15+  │
         │  (Auth + RLS)    │      │  EXCLUDE + RPC   │
         └──────────────────┘      └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐        Pasarela de pagos (adaptador)
         │ Storage (fotos)  │◀────── Culqi primero · mock en dev
         └──────────────────┘        Webhooks → /api/webhooks/pagos/*
```

Principios rectores:

1. **El navegador no decide nada crítico.** Disponibilidad, precios, montos y transiciones de estado se calculan y validan en el servidor.
2. **La base de datos es la última línea de defensa.** Superposición de reservas se impide con restricciones `EXCLUDE` + funciones SQL transaccionales, no solo con `SELECT` seguido de `INSERT`.
3. **Componentes servidor por defecto.** `"use client"` solo para interacción real (formularios, calendario, menú).
4. **Adaptadores, no acoplamiento.** Pagos (Culqi hoy, otros mañana) detrás de una interfaz.
5. **Datos mínimos.** La reserva pública no pide historia clínica ni diagnósticos.

## 2. Decisiones de arquitectura (ADRs)

### ADR-001 — Stack de aplicación: Next.js 16 (App Router) + TypeScript 7 estricto

**Estado:** Aceptado (FASE 0).

**Contexto:** Se requiere SSR/SSG, SEO, API server-side y despliegue barato con buen DX.

**Decisión:** Next.js **16.4.2** (latest estable en el registro, octubre 2026) con App Router y TypeScript **7.0.2** (compilador nativo en Go).

**Justificación verificada:**
- `npm view next dist-tags` → `latest: 16.4.2`; engines `node >= 20.9.0` (cumplido con Node 24.21.0 LTS).
- Next 16.3+ soporta TypeScript 7 mediante el *CLI checker* (tsc nativo): documentación oficial `nextjs.org/docs` "Using TypeScript 7". El compilador nativo no expone API JS; esto solo afecta a herramientas que importan la API del compilador (p. ej. typescript-eslint), no a `tsc`.
- React peer `^19.0.0` → React 19.3.1.
- Mitigación TS7: si `typescript-eslint` requiere API JS, instalar `@typescript/typescript6@^6.0.2` lado a lado (mecanismo recomendado por Microsoft), manteniendo `tsc` de TS7 para `typecheck` y `next build`.

**Consecuencias:** typecheck ~10× más rápido; riesgo controlado de herramientas de lint (mitigación anterior). Se revalidará en la instalación de FASE 1.

### ADR-002 — Backend: Supabase (PostgreSQL + Auth + RLS)

**Estado:** Aceptado.

**Justificación:** Base de datos relacional real con **restricciones de exclusión** (necesarias para anti-superposición), Auth con sesiones por cookie para el admin, SDK JS de alta calidad, RLS por defecto, capas gratuita/low-cost y región `sa-east-1` (São Paulo, la más cercana a Lima). Evita construir un backend ad-hoc para un consultorio de 1 profesional.

**Detalles:** El servidor usa el cliente `anon` con RLS para lecturas públicas y `service-role` **solo** en el servidor para operaciones privilegiadas (conciliación, webhooks, admin). Auth: Supabase Auth (email+password) exclusivamente para administradores.

### ADR-003 — Despliegue: Cloudflare Workers vía OpenNext (@opennextjs/cloudflare)

**Estado:** Aceptado, con condición de verificación temprana.

**Justificación verificada:**
- Documentación oficial OpenNext: *"All minor and patch versions of Next.js 16 ... are supported"*.
- Peer-deps de `@opennextjs/cloudflare@1.20.12`: `next >=15.5.28 <16 || >=16.4.1` → **16.4.2 soportado**.
- Costo predecible y bajo; CDN global; HTTPS y dominio propio nativos.

**Riesgo documentado:** Next 16 reemplaza `middleware.ts` por `proxy.ts` (runtime Node) y hubo incidencias de soporte de middleware Node en el adaptador (issues #1277/#1279, corregido por PR #1280). **Mitigación:** no usar `middleware.ts`/`proxy.ts` para lógica de negocio; el refresco de sesión del admin se hace en el layout servidor de `/admin`; se probará el despliegue "hola mundo + Supabase" al inicio de FASE 2 y en cada cierre de fase con `opennextjs-cloudflare build && wrangler dev`.

### ADR-004 — Pagos: interfaz de adaptador; Culqi primero; simulador en desarrollo

**Estado:** Aceptado. Detalle completo en [`docs/payments.md`](docs/payments.md).

**Resumen:** interfaz `PaymentGateway` (createCharge, getCharge, verifyWebhook), implementaciones `culqi` y `mock`. Monto del adelanto calculado server-side; el frontend solo recibe un intento de cobro. Confirmación de cita **solo** con pago acreditado verificado server-side. Idempotencia por referencia externa. Simulador aislado (`PAYMENTS_PROVIDER=mock`) imposible de activar en producción.

### ADR-005 — Concurrencia de reservas: EXCLUDE + RPC transaccional + hold temporal

**Estado:** Aceptado. Detalle completo en [`docs/database.md`](docs/database.md).

**Resumen:** (1) restricción `EXCLUDE USING gist` sobre el rango `tstzrange(starts_at, ends_at)` filtrada por estados activos; (2) función SQL `crear_reserva_con_hold()` que en una transacción valida horario laboral, bloqueos, buffer y gap, con bloqueo tipo advisory lock por día+profesional para serializar; (3) holds con `expires_at` y limpieza por job/CRON. El navegador consulta una vista de disponibilidad, pero la decisión la toma la transacción.

### ADR-006 — Paciente sin contraseña; consulta por token de alta entropía

**Estado:** Aceptado. La consulta/modificación de una reserva por el paciente usa URL con token aleatorio ≥128 bits (`/reserva/[token]`) con caducidad de vista y acciones limitadas (ver/reprogramar/cancelar). Solo el admin tiene credenciales.

### ADR-007 — Estructura del repo: monorepo simple con `src/`

**Estado:** Aceptado. Next.js en raíz con `src/` para separar app code de `docs/` y `supabase/`. Un solo package para simplificar CI/CD.

## 3. Render y caché

- Páginas públicas: RSC estáticas o ISR (`revalidate`) según contenido; servicios desde BD con revalidación corta.
- `/reservar`: cliente dinámico mínimo; disponibilidad via route handler cacheado por (servicio, fecha) con `no-store` en el paso final de confirmación.
- `/admin`: todo dinámico, `no-store`, protección por sesión en layout servidor.
- Imágenes: `next/image`, placeholders identificados `_DEMO`.

## 4. Zona horaria

- Todo timestamp en `timestamptz` (UTC en disco).
- Horario laboral y bloqueos definidos en hora local Lima; conversión con `Intl.DateTimeFormat` / `Temporal` (polyfill) hacia `America/Lima` en el servidor.
- Motor de disponibilidad: crea slots [inicio, inicio+duración+gap] y valida contra ocupaciones `tstzrange`.

## 5. Módulos de servicios (server-side)

```
src/lib/services/
  availability.ts    # cálculo de slots (puro, testeable con Vitest)
  bookings.ts        # ciclo de vida, estados, reprogramación
  holds.ts           # crear/validar/expirar holds
  payments.ts        # orquestación de cobros y conciliación
  gateway/           # interfaz + implementaciones (culqi, mock)
  tokens.ts          # generación/validación de tokens de reserva
  rate-limit.ts      # límites por IP+acción
  notifications.ts   # enlaces wa.me prellenados (fase 1-4); proveedor posterior
  reports.ts         # indicadores del dashboard
```

## 6. Riesgos técnicos y mitigaciones

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Middleware/proxy Node en Cloudflare no soportado al 100% | Media | Alto | Evitar middleware; sesión en layout servidor; prueba de despliegue temprana en FASE 2 |
| R2 | TypeScript 7 rompe herramientas que usan API JS (eslint) | Media | Medio | TS6 lado a lado (`@typescript/typescript6`) o fallback temporal a TS 5/6 |
| R3 | Webhook de pasarela retrasado → pago después de expirar el hold | Media | Medio | Flujo de conciliación explícito: pago tardío queda `RECONCILIATION`, admin reprograma o reembolsa |
| R4 | Latencia BD (São Paulo) en disponibilidad | Baja | Bajo | Vista de disponibilidad + caché por (servicio, fecha); confirmación siempre server-side |
| R5 | Límite de tamaño de Worker (3 MiB free) | Baja | Medio | Revisar bundle; plan pago si hace falta; alternativa Vercel documentada |
| R6 | Cambios de API de Culqi (webhooks/firma) | Media | Alto | Seguir docs vigentes al integrar (FASE 5); adaptador aísla el cambio; sandbox primero |
| R7 | Doble envío de formulario → doble hold | Media | Bajo | Token idempotente en el POST + rate limit + RPC devuelve hold existente |
