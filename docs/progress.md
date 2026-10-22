# Registro de avance — ALMAE DIGITAL 1.0

> Bitácora por fase: qué se hizo, qué se probó (realmente), qué queda pendiente.

---

## FASE 0 — Auditoría del entorno y planificación

**Fecha:** 2026-10-17
**Estado:** ✅ Completada (pendiente aprobación del propietario para FASE 1)

### Entorno verificado (comandos ejecutados)

| Herramienta | Versión | Resultado |
|---|---|---|
| Node.js | v24.21.0 (LTS) | ✅ Cumple engines de Next 16 (`>=20.9.0`) |
| npm | 11.19.0 | ✅ |
| Git | 2.55.0.windows.3 | ✅ |
| Directorio de trabajo | `D:\ALMAE_DIGITAL` | Vacío antes de FASE 0; repo Git inicializado |
| pnpm / yarn / bun | No instalados | Se usa npm (instalado); no se instalaron gestores extra |

### Versiones del stack verificadas contra el registro npm (2026-10-17)

| Paquete | Versión (latest) | Compatibilidad verificada |
|---|---|---|
| next | 16.4.2 | engines `node>=20.9.0`; peer react `^19.0.0` |
| react / react-dom | 19.3.1 | cumple peer de Next 16 |
| typescript | 7.0.2 (nativo) | Next 16.3+ lo soporta vía CLI checker (docs oficiales) |
| tailwindcss | 4.3.3 | con `@tailwindcss/postcss` 4.3.3 |
| @supabase/supabase-js | 2.118.0 | — |
| @supabase/ssr | 0.12.7 | — |
| zod | 4.6.7 | con @hookform/resolvers 5.9.1 |
| react-hook-form | 7.90.0 | — |
| vitest | 5.0.5 | peer `@types/node ^22.0.0 \|\| >=24.0.0` (Node 24 OK) |
| @playwright/test / playwright | 1.64.1 | — |
| eslint / eslint-config-next | 10.13.0 / 16.4.2 | — |
| prettier | 3.9.10 | — |
| @opennextjs/cloudflare | 1.20.12 | peer `next >=15.5.28 <16 \|\| >=16.4.1` → **16.4.2 soportado** |
| wrangler | 4.151.1 | peer requerido `^4.148.0` → OK |
| @typescript/typescript6 | 6.0.2 | reserva para tooling que requiera API JS (typescript-eslint) |

### Compatibilidad con documentación oficial (web, 2026-10-17)

- ✅ OpenNext (docs oficiales): *"All minor and patch versions of Next.js 16 ... are supported"*.
- ✅ TypeScript 7.0 (anuncio oficial Microsoft, 2026-07-08): compilador nativo, sin API JS; Next.js usa el CLI checker por defecto.
- ⚠️ Riesgo R1 documentado: `proxy.ts` (middleware Node de Next 16) tiene historial de incidencias en Cloudflare; mitigación adoptada (no usar middleware; sesión en layout servidor; prueba temprana de despliegue en FASE 2).
- ⚠️ Riesgo R2 documentado: typescript-eslint puede requerir TS 6 lado a lado; plan de mitigación en ADR-001.

### Entregables creados

- `README.md`, `AGENTS.md`, `.gitignore`, `.env.example`
- `docs/architecture.md` (ADRs 001–007), `docs/requirements.md`, `docs/roadmap.md`, `docs/database.md`, `docs/security.md`, `docs/payments.md`, `docs/deployment.md`, `docs/test-plan.md`, `docs/progress.md`

### Pruebas ejecutadas en esta fase

- Auditoría de entorno y versiones (comandos reales arriba). **No se instaló ninguna dependencia ni se escribió código de aplicación** (alcanze de FASE 0).

### Pendientes para el propietario (antes/durante FASE 1–2)

1. Confirmar los accesos externos: GitHub, Supabase (crear proyecto región sa-east-1), Cloudflare + dominio, Culqi (sandbox), número de WhatsApp Business.
2. Definir datos reales (o autorizar demo marcada): teléfono WhatsApp, dirección referencial, lista de servicios con precios/duraciones/adelantos, horario laboral real, política de cancelación.
3. Crear los usuarios admin en Supabase cuando exista el proyecto (email se configura en el panel; sin contraseñas por chat).
4. Aprobar el primer commit del repositorio (la estructura está creada, commit no ejecutado aún).

### Siguiente paso

FASE 1 — Interfaz pública y navegación (inicialización del proyecto Next 16 + Tailwind 4 + TS 7 y páginas públicas). Requiere aprobación del propietario.

---

## FASE 1 — Interfaz pública y navegación

**Fecha:** 2026-10-17
**Estado:** ✅ Completada (pendiente revisión visual del propietario)

### Instalación verificada

| Componente | Versión instalada |
|---|---|
| next | 16.4.2 |
| react / react-dom | 19.3.1 |
| typescript | 6.0.3 (alias oficial `npm:@typescript/typescript6@^6.0.2` — ver ADR-001) |
| tailwindcss + @tailwindcss/postcss | 4.3.3 |
| eslint + eslint-config-next | 10.13.0 / 16.4.2 (flat configs nativos, sin @eslint/eslintrc) |
| prettier | 3.9.10 |
| @types/react / @types/react-dom / @types/node | 19.3.0 / 19.3.0 / 26.6.5 |

- Instalación requirió 2 intentos (ECONNRESET de red); exitoso al reintentar, 358 paquetes.
- `npm audit`: 5 vulnerabilidades "high" **solo en la cadena de lint dev** (braces→micromatch→fast-glob→@next/eslint-plugin-next). El `fix` propuesto degradaría Next a 14: se descarta. Riesgo dev aceptado y documentado (no afecta build ni producción). Pendiente vigilar upstream.

### Entregables FASE 1

- Sistema de diseño con tokens Tailwind 4 (`@theme`): verde petróleo (brand), salvia, arena cálida, tintas, verde WhatsApp — sin hex sueltos.
- Tipografía: Inter (cuerpo) + Plus Jakarta Sans (títulos) autoalojadas con `next/font`.
- Componentes: Header responsive (menú móvil accesible, Escape/clic), Footer, botón flotante WhatsApp, Banner de datos demo (solo desarrollo), Button/Section/PageHero/Placeholder (identificado "demo, no es foto real"), ServiceCard, FAQ (`details/summary`), PendingPage.
- Páginas: `/`, `/servicios`, `/servicios/[slug]` (6 servicios SSG), `/nosotros`, `/promociones` (estado vacío honesto), `/contacto` (5 accesos WhatsApp contextuales), `/privacidad`, `/terminos`, `/politica-de-reservas` (borradores rotulados para revisión legal), `/reservar`, `/reserva/[token]`, `/pagos/resultado` (pendientes visibles con fase indicada), `not-found`, `sitemap.xml`, `robots.txt`, favicon.
- Accesibilidad: skip-link, landmarks, aria-current/aria-expanded, foco visible, botones ≥44 px, contraste AA.

### Validaciones ejecutadas (resultados reales)

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ limpio (0 errores, 0 avisos) |
| `npm run typecheck` (`tsc --noEmit`) | ✅ limpio |
| `npm run build` | ✅ 21 rutas estáticas generadas |
| Prueba de humo (`next start`) | ✅ 200 en /, /servicios, /servicios/terapia-manual, /contacto, /reservar, /politica-de-reservas; 404 correcta en ruta inexistente |

### Correcciones durante la fase

- Riesgo R2 confirmado: typescript-eslint no soporta TS 7.0 → alias oficial TS6 aplicado (documentado en ADR-001).
- Lint detectó 2 hallazgos corregidos: efecto con `setState` síncrono en Header (cerrado por interacción), import sin uso en nosotros.

### Pendientes declarados

1. Número real de WhatsApp — **resuelto** (ver "Integración de identidad real").
2. Fotografías/branding reales — **resuelto** para logo, profesional y consultorio; pendientes más fotos de galería.
3. Revisión y aprobación de los textos legales por asesor (hoy rotulados borrador).
4. Precios oficiales y horario real (igual provisionales).
5. Prueba visual del propietario en dispositivo móvil (375 px).

### Integración de identidad real (misma fase, autorizada por el propietario)

El propietario aportó en `Imagenes/` los activos oficiales y autorizó su integración:

- **Identidad real activada:** logo oficial "ALMAE Terapia y Spa" (header negro / footer blanco / favicon), Tec. Fisioterapeuta **Leonor Morán René**, dirección **Altos del Rímac 250, Torre 2, Dep. 104** (Lima), WhatsApp **919 608 174** (`wa.me/51919608174`, público según flyers del propio negocio).
- **Catálogo real (según flyers oficiales):** Terapia física y rehabilitación (cervicalgia, lumbalgia, esguince, tendinitis, bursitis, lesiones deportivas; equipos: ultrasonido, TENS, láser, punción seca, ventosas), Masaje antiestrés ALMAE, Masaje reductor (drenaje linfático brasileño + moldeamiento + maderoterapia), Reflexología facial y podal. **Los precios siguen siendo provisionales.**
- **Paleta oficial terracota/crema** reemplaza el verde petróleo provisional (tokens `brand-*`, `sand-*`, `sage-*`→greige cálido, `ink-*`).
- **Fotografías autorizadas publicadas:** profesional (junto al letrero y retrato oficial) e interior del consultorio. Redimensionado (1400 px, JPEG q85) el archivo de 3 MB → 646 KB.
- **Fotografías excluidas por protección de datos (Ley 29733):** 4 imágenes muestran a un paciente identificable (camilla/caminador). Requieren consentimiento expreso y no se publican. **Acción pendiente del propietario:** consentimiento escrito del paciente o decisión de no publicarlas.
- **Promoción de aniversario (julio) NO publicada** como vigente: está vencida. Pendiente: definir promociones vigentes.
- Archivos públicos: `public/almae-logo-{negro,blanco}.png`, `public/fotos/{profesional,consultorio-atencion,especialista-letrero}.jpg`, `src/app/icon.png` (favicon con logo real; `icon.svg` provisional eliminado).
- `catalog.ts` reemplaza a `demo-data.ts` con el catálogo real; `site.ts` centraliza identidad, dirección, profesional y WhatsApp (fallback público autorizado, configurable por env).

**Validaciones re-ejecutadas tras la integración:** lint ✅, typecheck ✅, build ✅ (19 rutas, 4 servicios SSG). Prueba de humo: rutas/activos 200; contenido verificado en HTML (enlace WhatsApp, nombre del profesional, foto hero, logo, equipos del catálogo).

### Actualización de catálogo y fotos (misma fase, segunda tanda de activos)

El propietario aportó tarjetas de servicios **con precios reales** (`Imagenes/Servicios/`) y fotos nuevas:

- **Precios oficiales integrados:** Terapia física y rehabilitación consultorio S/50 (duración por confirmar, provisional 60 min); Masaje antiestrés 60 min S/70 y 90 min S/90; Masaje estético reductor consultorio 90 min S/150; Reflexología podal y facial consultorio 60 min S/60. **A domicilio** (coordina por WhatsApp, sin reserva en línea en el MVP): terapia física S/80, antiestrés S/120 (60) / S/150 (90), reductor S/200 (90), reflexología S/70 (60).
- **Nuevos servicios sin precio:** Acupuntura y Entrenamiento físico — visibles con "Precio por confirmar", CTA WhatsApp; no reservables en línea hasta definir precio/duración.
- **Modelo de datos actualizado** (`docs/database.md` §1.3): `service_variants` (duración+precio por variante) y `services.location` (`consultorio`/`domicilio`); adelanto queda NULL "por definir" hasta que el propietario fije la política.
- **Fotos reemplazadas:** hero → consultorio luminoso; especialista → retrato ejecutivo de la directora; galería con 3 fotos reales (consultorio luminoso, área de atención, especialista con letrero). 8 tarjetas de servicios convertidas a JPEG optimizado (125–147 KB cada una).
- **Dirección simplificada** según instrucción: "Altos del Rímac 250, Rímac — Lima, Perú" (sin torre/depto).
- `/servicios` agrupado: "En consultorio" (6) y "A domicilio" (4).

**Validaciones re-ejecutadas:** lint ✅, typecheck ✅, build ✅ (25 rutas, 10 servicios SSG). Prueba de humo: 200 en todas las rutas y fotos nuevas; precios, grupos, servicios nuevos, variantes, WhatsApp y dirección verificados en HTML.

### Cierre del brief de FASE 1 (tercera ronda)

- **Paleta definitiva por decisión del propietario: verde petróleo + salvia + blanco + crema** (revierte terracota; tokens editables en `@theme`).
- Galería "Un espacio preparado para tu recuperación" usa **solo la primera fotografía** (consultorio luminoso).
- **Hero con copy del brief:** "Tu bienestar comienza con el movimiento" + subtítulo oficial + botones "Agendar mi cita" y "Consultar por WhatsApp".
- Nueva sección **"Cómo funciona"** (4 pasos) con aviso explícito de reserva en línea en preparación.
- Nueva sección **"Promociones"** en home (estado honesto sin ofertas sin aprobación) con enlace a `/promociones`.
- **Redes sociales configurables** en footer vía `NEXT_PUBLIC_SOCIAL_LINKS="Etiqueta|URL,..."` (no se muestran si no existen).
- **Suite Playwright** (9 pruebas): navegación header, menú móvil (abrir/navegar/Escape), página de reserva en preparación, consola sin errores, enlaces internos sin rotos, WhatsApp habilitado, capturas 375/768/1440 → `docs/screenshots/fase1-home-*.jpg`.
- Criterio del brief: botones "Agendar" conducen a página identificada como próxima implementación ✅ (sin reserva falsa ni pagos simulados).

**Pendientes del propietario (acumulados):**
1. Duración real de la terapia física (consultorio y domicilio) — hoy provisional 60 min.
2. Política de adelanto (monto o %) — hoy "por definir" en el sitio.
3. Precio y duración de acupuntura y entrenamiento físico.
4. Horario laboral real (hoy provisional).
5. Consentimiento de las 4 fotos con paciente (no publicadas).
6. Revisión legal de documentos.
7. Revisión visual del sitio en su celular.

---

## FASE 2 — Supabase, autenticación y estructura de datos

**Fecha:** 2026-10-17
**Estado:** ✅ Completada (pendiente conectar proyecto Supabase real del propietario)

### Entregables

- **Dependencias instaladas y verificadas:** @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, zod 4.6.7, @playwright/test 1.64.1 (chromium 156 local).
- **Migraciones SQL versionadas aplicadas y validadas en stack local Docker:**
  - `0001_enums.sql` — 14 enums (estados de reserva/pago independientes).
  - `0002_tables.sql` — 17 tablas con FKs, índices, checks, columna generada `hold_range` y **restricción EXCLUDE USING gist** (anti-superposición física, filtrada por estados activos).
  - `0003_rls.sql` — RLS en todas las tablas, función `es_administrador()` (security definer), lecturas públicas mínimas (servicios activos, variantes, horarios, excepciones, fuentes, configuración), políticas admin por operación.
  - `0004_triggers.sql` — `set_updated_at` en 13 tablas, tabla de transiciones válidas + trigger guard, eventos automáticos de reserva, y trigger `confirmar_reserva_por_pago` (pago SUCCEEDED con booking vigente → CONFIRMED; nunca confirma sin pago).
  - `0005_seed_demo.sql` — configuración (hold 10 min, gap 15, PEN/Lima), 6 fuentes `_DEMO`, horario provisional (L–V 8–20 con break 13–16, S 9–13) y **catálogo real** (10 servicios + 10 variantes con precios oficiales; adelanto NULL = por definir).
- **Tipos generados:** `src/types/database.ts` vía `supabase gen types typescript --local`.
- **Clientes Supabase:** `lib/supabase/{env,server,client}.ts` (SSR con cookies; guard de configuración ausente).
- **Autenticación admin:** server actions con validación Zod (`iniciarSesion`, `cerrarSesion`); `/admin/login` con estados de error accesibles y aviso demo solo en desarrollo; layout `/admin/(protegido)` con sesión server-side (`getUser`), verificación de `admin_profiles` y `force-dynamic`. Corregido bucle de redirección inicial con route group.
- **Usuario demo local:** `admin@almae.demo` (creado por script; credencial visible solo en la pantalla local de desarrollo; cambiar antes de producción).

### Pruebas ejecutadas (reales)

| Prueba | Resultado |
|---|---|
| `npx supabase db reset` (5 migraciones) | ✅ aplicadas sin errores |
| `scripts/verificar-rls.mjs` | ✅ **11/11** (anon no lee tablas privadas ni inserta; anon sí lee servicios/variantes/horarios; admin lee bookings; service-role lee config) |
| `npm run lint` | ✅ limpio |
| `npm run typecheck` | ✅ limpio |
| `npm run build` | ✅ 27 rutas (/admin y /admin/login dinámicas) |
| Playwright: login/logout completo + credenciales inválidas + redirección sin sesión | ✅ (12/12 total del portal) |

### Pendientes

1. **Conectar proyecto Supabase real** del propietario (URL + claves en `.env.local`/secrets del despliegue) y aplicar migraciones con `supabase link` + `db push` (requiere autorización).
2. Smoke test de despliegue a Cloudflare con Supabase conectado (riesgo R1 del ADR-003) — al crear el repo remoto.
3. Regenerar tipos tras conectar al proyecto real.
4. Política de adelanto (monto/%) del propietario antes de FASE 4.
5. Duraciones reales de terapia física; precios de acupuntura/entrenamiento.

### Nota de compatibilidad GitHub

- `.env.local` ignorado por Git (verificado: no versionado; solo `.env.example`).
- Ninguna clave local/publicada en docs ni código versionado (verificado con `git grep`).
- Comandos de setup documentados y multiplataforma (Node `--env-file`, npm scripts sin dependencia de shell).
- Carpeta `Imagenes/` del propietario excluida del repo (contiene fotos de pacientes sin consentimiento publicado; ver FASE 1).

---

## HITO 2.2 — Base de datos definitiva (flujo WhatsApp, agenda unificada)

**Fecha:** 2026-10-20
**Estado:** En ejecución — subetapas

### H2.2-a — Compilación y suite verde ✅

**Cambio de requerimiento aplicado:** el pago web (simulador) se **retira del flujo del paciente**; la retención de 15 minutos coordina el adelanto por WhatsApp y **solo el administrador confirma** tras verificar el pago. Culqi queda desacoplado para una fase futura opcional (se conserva `lib/payments/gateway.ts` como interfaz).

**Migraciones incrementales aplicadas (ninguna migración aplicada fue modificada):**
- `0008_modelo_definitivo.sql`: dinero en **céntimos** (`amount_cents`, `deposit_required_cents`, `deposit_cents` en variantes), `origin` (WEB/IN_PERSON/ADMIN), `public_code` único (ALM-XXXX…), **hash SHA-256 del token** (el texto plano queda solo de paso para el backfill), `confirmed_at/confirmed_by/cancellation_reason`, roles ampliados (`admin/professional/receptionist`), `admin_profiles.active`, `max_hold_extension_minutes` (30), tablas nuevas **`manual_payments`** (YAPE/PLIN/BANK_TRANSFER/CASH/OTHER; REPORTED/VERIFIED/REJECTED; unique por método+referencia) y **`schedule_blocks`** (BREAK/INTERNAL/ABSENCE/MAINTENANCE/OTHER), y **`agenda_occupancy`** unificada con **EXCLUDE GiST** + triggers de sincronización transaccional desde bookings y bloques (backfill de ocupación existente), vista `bookings_resumen_economico`, trigger de confirmación por pago deshabilitado (el flujo nuevo solo confirma el owner).
- `0009_funciones_operativas.sql`: `crear_retencion_web` (RPC pública controlada: valida servicio/variante/ventana/horario/excepciones/**ocupación unificada con gap** + advisory lock + upsert paciente + código público + token de 256 bits con hash), `obtener_reserva_por_token`/`cancelar_reserva_por_token` (por **hash**), `expirar_retenciones` (idempotente), matriz de transiciones del flujo definitivo (HELD/CONFIRMED/EXPIRED/CANCELLED/COMPLETED/NO_SHOW).
- `0010_operaciones_admin_rls.sql`: `es_owner_activo()`, `confirmar_reserva_admin` (transaccional: FOR UPDATE, rechaza vencida/estado inválido/slot libre, **exige adelantos VERIFIED ≥ requerido**, idempotente, auditada), `extender_retencion` (límite configurable, no reactiva vencidas), `crear_reserva_presencial` (CONFIRMED inmediato + exención de adelanto con motivo), `crear_bloqueo_agenda` (reporta conflictos con citas antes de bloquear; nunca borra citas), `liberar_bloqueo_agenda` + **RLS** de las 3 tablas nuevas.
- `0011_horarios_definitivos.sql`: `day_of_week` **ISO (1=lun…7=dom)**, varios bloques por día (cae el UNIQUE), validador `validar_semana_laboral`.

**App:**
- Flujo del paciente: wizard → retención → **página de reserva con código público, contador de 15 min (informativo), mensaje del flujo y botón WhatsApp prellenado** (código+servicio+fecha+hora). Cancelación según política.
- Motor de disponibilidad **multi-franja por día** (varios bloques diarios) + descansos + ocupaciones de citas **y bloqueos** + lead/gap; revalidación server-side.
- Retiro del pago simulado: eliminados checkout/resultado/webhook mock y sus pruebas; `/api/cron/expire-holds` apunta a `expirar_retenciones`.
- Expiración **lazy en servidor** al consultar disponibilidad y al crear retención (no depende del navegador ni del cron puntual).

**Correcciones aplicadas durante la subetapa:** sintaxis SQL inválida (index dentro de ALTER; ternario inexistente en PL/pgSQL), variables no declaradas, permisos EXECUTE para `service_role` tras los revoke, filtrado de deletes con enums (PostgREST no acepta valores fuera del enum), test E2E con fechas futuras (la agenda real satura fechas fijas), contador con setState solo en callbacks (purity).

**Validaciones ejecutadas (reales):** lint ✅ 0 problemas · typecheck ✅ limpio · vitest ✅ **11/11** · build ✅ (28 rutas). E2E del flujo completo: pendiente en H2.2-b (declarado).

### Pendientes del hito

- **H2.2-b:** panel admin adaptado (confirmar con resumen de pago verificado, extender retención, adelantos manuales REPORTED/VERIFIED/REJECTED, reservas presenciales, bloques en agenda, reprogramación) + regeneración de tipos tras verificación + E2E de flujo completo (retención → WhatsApp → validación admin → CONFIRMED) + pruebas SQL de los 25 casos (concurrencia incluida).
- **H2.2-c:** documentación (erd.md, rls-matrix.md, booking-flow.md, manual-payments.md, admin-calendar.md, migrations.md, testing-database.md, database.md, security.md, requirements.md, roadmap.md) + informe final.

---

## FASE 3 — Motor de disponibilidad y reservas

**Fecha:** 2026-10-17
**Estado:** ✅ Completada

### Entregables

- **Motor de disponibilidad puro** (`src/lib/services/availability.ts`): slots por fecha con horario laboral, descansos, duración+prep, gap, ocupaciones y antelación; timestamps UTC con offset fijo Lima (sin DST). `slotSigueDisponible` revalida server-side antes de la RPC.
- **Migración `0006_funciones_reservas.sql`**:
  - `crear_reserva_con_hold()` — RPC transaccional security-definer: valida servicio/variante activos (solo consultorio), ventana de fechas (lead/horizonte), horario laboral + descanso, excepciones de agenda (full_day/partial/holiday), **gap con margen alrededor de ocupaciones**, advisory lock por servicio+fecha (serializa la carrera), upsert de paciente por teléfono con consentimiento diferenciado, idempotencia (misma cita vigente se devuelve sin duplicar), token de 256 bits y `expires_at` según configuración.
  - `obtener_reserva_por_token()` — consulta limitada (sin datos de terceros) + `puede_cancelar` calculado en servidor.
  - `cancelar_reserva_por_token()` — HELD siempre; CONFIRMED solo dentro del plazo de política.
  - `expirar_holds()` — marca EXPIRED los holds/pagos vencidos (CRON/lazy).
  - Privilegios: RPCs de paciente `anon`; `expirar_holds` solo service-role.
- **Corrección de diseño en 0002**: `profesional_clave` generada (coalesce) para que la exclusión gist no eluda el solapamiento cuando `professional_id` es NULL.
- **Servicios server-side**: `disponibilidad.ts` (ensambla settings/horas/excepciones/ocupaciones con service-role), `reservas.ts` (mensajes amigables es-PE), `rate-limit.ts` (memoria, por IP+acción; Upstash opcional).
- **API**: `GET /api/disponibilidad` (Zod + 60 req/min/IP, no-store) y `POST /api/reservas` (Zod estricto: teléfono 9 dígitos, consent requerido, 5 req/min/IP; 409 con mensaje claro).
- **UI `/reservar`**: wizard de 3 pasos (servicio → fecha/hora con slots reales → datos con consentimiento) con estados de carga y error; catálogo leído de la BD (sin configuración muestra aviso, nunca datos falsos).
- **UI `/reserva/[token]`**: estado real, fecha/hora Lima formateadas, precios, saldo, cancelación según política, contacto WhatsApp, aviso de pago en preparación (Fase 4).
- **CRON**: `POST /api/cron/expire-holds` con `Authorization: Bearer CRON_SECRET`.

### Pruebas ejecutadas (reales)

| Prueba | Resultado |
|---|---|
| Vitest motor (10 pruebas: horario, cerrado, descansos, gap, lead, horizonte, zona horaria, validación de slot) | ✅ 10/10 |
| `scripts/probar-motor.mjs` contra RPC real: **concurrencia** (5 POST simultáneos mismo slot → exactamente 1 gana, 4 rechazadas) | ✅ |
| Token válido → HELD; token inválido → no encontrado; expiración manual → `EXPIRED` y slot liberado | ✅ |
| lint / typecheck / build | ✅ / ✅ / ✅ |
| Playwright: **flujo completo de reserva** (wizard → hold → token page → cancelar) | ✅ **13/13** total |

### Pendientes

1. Conectar proyecto Supabase real (FASE 2, acumulado).
2. Recordatorios/notificaciones (Fase 8).
3. Vista semanal/mensual de agenda (Fase 6).
4. Pago real del adelanto para CONFIRMED (Fase 4 — la cita queda HELD hasta entonces, por diseño).

---

## FASE 4 — Adelantos simulados y flujo de confirmación

**Fecha:** 2026-10-17
**Estado:** ✅ Completada (pasarela real Culqi = FASE 5)

### Entregables

- **Migración `0007_politica_adelanto.sql`**: `business_settings.advance_percent` (parámetro editable, valor provisional **40%** — el propietario puede cambiarlo; se aplica cuando la variante no define `advance_amount`); RPC `crear_reserva_con_hold` recalculada para fijar el adelanto en la reserva; `expirar_pagos()` para el CRON.
- **Adaptador de pagos** (`src/lib/payments/gateway.ts`): interfaz `PasarelaPagos`, selección por `PAYMENTS_PROVIDER`, y guard fail-closed: `esProduccion()` = todo lo que no sea explícitamente `NEXT_PUBLIC_ENV=development`; **el simulador es imposible en producción** (revisado en orquestador, checkout y webhook).
- **Orquestador** (`src/lib/payments/orquestador.ts`): iniciar pago (reutiliza intención pendiente; monto SIEMPRE leído de BD), webhook con firma **HMAC-SHA256** (`timingSafeEqual`), idempotencia por `event_id`, match de monto/moneda, y conciliación: pago tardío → `RECONCILIATION` + fila en `payment_reconciliation(late_after_hold)`; monto disímil → `mismatch_amount`; pago fallido sobre HELD → reserva CANCELLED.
- **Webhook route** `/api/webhooks/pagos/[proveedor]`: firma obligatoria, 403 en producción, rate limit.
- **Checkout simulador** `/pagos/checkout/[referencia]` (solo dev): aprobar / rechazar / **enviar webhook duplicado** (demuestra idempotencia en vivo). Server actions firman y envían server-to-server (el navegador no confía en nada).
- **Resultado real** `/pagos/resultado/[referencia]`: lee el estado desde la BD (nunca de la URL), con auto-recheck mientras PENDING; card de éxito enlaza a la reserva; fallo → no confirma; expirado → orientación; conciliación → aviso de contacto.
- **`/reserva/[token]`**: botón "Pagar adelanto S/ XX" cuando está en HELD.
- **Env**: `PAYMENTS_MOCK_WEBHOOK_SECRET` en `.env.example`/`.env.local`.

### Pruebas ejecutadas (reales)

| Prueba | Resultado |
|---|---|
| Vitest integración de pagos (6): aprobado→CONFIRMED, duplicado→1 solo evento, rechazado→CANCELLED, tardío→RECONCILIATION+EXPIRED, mismatch→RECONCILIATION sin confirmar, firma inválida→401, iniciar pago en reserva expirada→rechazo | ✅ **16/16 totales** |
| Playwright E2E (4 flujos de pago en navegador): aprobar→confirmada, rechazar→no confirmada, webhook duplicado→una sola confirmación, reserva+hold+cancelación | ✅ **16/16 totales** |
| lint / typecheck / build | ✅ ✅ ✅ |

### Correcciones durante la fase

- Bug PostgREST: `data: []` (truthy) interpretaba TODO evento como duplicado → check por `length`.
- Bug de parseo: `time` con segundos de la BD malformaba el ISO del descanso (`T13:00:00:00`) → descanso ignorado en disponibilidad → corregido `fechaHoraLimaADate`.
- Guard de producción: ahora fail-closed por `NEXT_PUBLIC_ENV` (el E2E corre sobre build de producción con `.env.local` cargado por `next start`).
- Limpieza E2E: `limpiarAgendaLocal()` con guard 127.0.0.1 (solo local); slots de prueba estables (18:00) fuera del break.

### Pendientes

1. **FASE 5**: adaptador Culqi real (sandbox), revalidando en ese momento endpoints/firmas contra la documentación vigente del proveedor.
2. Política de adelanto definitiva (hoy 40% provisional, editable en BD).
3. Duraciones reales de terapia física; precios de acupuntura/entrenamiento.
4. Bandeja de conciliación en admin (Fase 6).

---

## Hito 2.2 — modelo definitivo de retención, agenda unificada y confirmación manual (2026-10-21)

### Implementación
- **Migraciones 0008–0013** aplicadas en local: roles admin, orígenes WEB/IN_PERSON/ADMIN, dinero en céntimos, código público `ALM-`, token por hash SHA-256, `schedule_blocks`, `manual_payments`, `agenda_occupancy` (agenda unificada con EXCLUSION GiST + triggers de sincronización), vista `bookings_resumen_economico`, RPCs definitivas (`crear_retencion_web`, `obtener_reserva_por_token`, `cancelar_reserva_por_token`, `expirar_retenciones`, `confirmar_reserva_admin`, `extender_retencion`, `crear_reserva_presencial`, `crear_bloqueo_agenda`, `liberar_bloqueo_agenda`, `hay_conflicto_agenda`), horarios ISO 1–7 y depósito por defecto (40% provisional editable).
- Retiro del flujo de pago simulado: `/pagos/*`, webhooks mock y orquestador eliminados; el paciente coordina el adelanto por WhatsApp y el admin registra/verifica/confirm manualmente (se conserva `payments/gateway.ts` para Culqi futuro).
- Motor de disponibilidad reescrito multi-franja (ventanas con descansos por franja, bloques de agenda como ocupación, excepciones, expiración lazy).
- Página `/reserva/[token]` nueva: código público, contador de retención, WhatsApp "Coordinar adelanto", cancelación según política.
- Panel: confirmar cita (valida retención + adelanto verificado), extender retención (cap 30 min), registrar/verificar/rechazar adelantos manuales, reprogramar con chequeo de conflicto, reserva presencial, bandeja de pagos.

### Correcciones durante el hito
- Columna generada `profesional_clave` (la hilera NULL de professional_id esquivaba la exclusión GiST) → anti-solape real en BD.
- Migración 0013: `access_token`/hash nullable (presenciales no generan token).
- PostgREST: filtros de delete con valores de enum válidos (el uso de valores inexistentes hacía que nunca se borrara); arrays vacíos interpretados como duplicados; fechas relativas dinámicas en pruebas (la fecha fija dejó de ser futura).

### Pruebas ejecutadas
- `tests/hito22.test.ts`: **13/13** — T01–T23 (concurrencia 1 gana, doble reserva, RLS anon, referencias duplicadas, bloqueos, snapshot histórico) → total Vitest **24/24**.
- Playwright E2E: **16/16** (×2 corridas seguidas): portal, wizard→token, cancelación por token, admin (login/logout, credenciales inválidas), panel (recorrido de secciones, **adelanto verificado → confirmar cita → estado público CONFIRMED**, creación de servicio con slug/nombre únicos).
- `scripts/probar-motor.mjs` reescrito a las RPCs nuevas: concurrencia 1/5, token válido/inválido, expiración → MOTOR_OK.
- lint / typecheck / build ✓.

### Commits
- `0abc106` hito-2.2a (modelo + RPCs + retiro de pago simulado)
- `358caec` hito-2.2b (depósito por defecto, casos SQL, integridad)
- `2de0f66` hito-2.3 (panel en español es-PE + recuperación de contraseña)
- `0b984bd` fix(admin,public): columnas renombradas + catálogo en céntimos
- `5122af4` test(e2e): suite al modelo de retención

## Hito 2.3 — español (es-PE) y recuperación de contraseña

- `src/lib/locale.ts` centraliza locale/tiempo; fechas DD/MM/AAAA; `errores-auth.ts` traduce errores de Supabase; login/recuperación/cambio de contraseña completos; nav "Dashboard" → "Panel de control"; pendiente configurar plantillas de correo en Dashboard (docs/supabase-setup.md).

## Hito 3.1 — cierre técnico (lanzadores y validación)

- Lanzadores: `INICIAR_ALMAE.bat` (detecta 3000/3001, reutiliza ALMAE activo, espera HTTP y abre Chrome) y `DETENER_ALMAE.bat` (solo detiene el proceso en 3000/3001 que responde con ALMAE y es node.exe, con confirmación).
- Acceso: `docs/COMO_ABRIR_ALMAE.md`; tarea de Cursor en `.vscode/tasks.json`.
- Correcciones: los .bat se guardan con CRLF; paréntesis en mensajes rompían bloques `if`; la parada validaba el PID antes de comprobar que el puerto fuera ALMAE.
- Pruebas reales: typecheck OK; lint OK; Vitest 24/24 (corregido `hito22.test.ts`: la fecha fija caía en sábado con horario 09–13); `probar-motor.mjs` MOTOR_OK; Playwright 16/16; build OK.
- Lanzador probado: 3000 ocupado por proceso ajeno → usa 3001, responde 200 con ALMAE; reutiliza el servidor activo; DETENER cierra solo ALMAE (3000 ajeno intacto).
- Pendiente de Hito 3.2: bandeja de reservas HELD con tiempo restante, actualización sin recarga, historial consolidado de adelantos y módulo CMS completo.

## Hito 3.2-A1 — bandeja de reservas pendientes

- `/admin/reservas`: sección "Pendientes de confirmación" (HELD vigentes, ordenadas por vencimiento) con código, paciente, servicio, fecha/hora, adelanto requerido, verificado, saldo pendiente, tiempo restante, estado y "Ver detalle".
- Lógica pura en `src/lib/services/bandeja-reservas.ts`: clasificación (pendiente / próxima a vencer / expirada), saldo solo con adelantos VERIFIED (los REPORTED no cuentan).
- Actualización: `ActualizadorBandeja` (router.refresh cada 15 s, pausado con la pestaña oculta) y `ContadorRestante` (contador local de 1 s desde el vencimiento del servidor, sin consultas a Supabase).
- Reutiliza confirmación, extensión, registro y verificación de adelantos del detalle existente (sin mecanismos nuevos).
- Pruebas reales: Vitest 32/32 (8 nuevas en `tests/bandeja-reservas.test.ts`); Playwright módulo 2/2 y regresión admin 6/6; typecheck OK; lint OK; build OK.
- Pendiente 3.2-A2: validación de confirmación desde la bandeja (botón directo), historial consolidado de adelantos en /admin/pagos, y pruebas de reserva expirada y protección owner de la bandeja.

## Hito 3.2-A2 — confirmación desde bandeja, historial de adelantos y extensión acumulada

- Confirmación directa desde la bandeja: botón "Confirmar cita" por fila (deshabilitado si no es confirmable o falta adelanto VERIFIED; bloqueado mientras hay una operación en curso vía `useFormStatus`) reutilizando `aprobarConfirmacion`, con retorno validado a `/admin/reservas` y banner de éxito/error.
- Historial consolidado de adelantos en `/admin/pagos`: filtros por rango de fechas (días calendario en America/Lima), estado, método, búsqueda por código o nombre de paciente, paginación en servidor (25/página), verificador y totales contando **solo VERIFIED**; lógica pura en `src/lib/services/pagos-historial.ts`.
- Migración `0015`: `extender_retencion` ahora limita el tiempo **acumulado** (vencimiento actual − creación − TTL) y rechaza con `extension_excede_maximo` + `acumulado_minutos`/`disponible_minutos`; `confirmar_reserva_admin` ya no inserta su propio evento (el trigger lo registra con el motivo vía `app.booking_reason`), evitando eventos CONFIRMED duplicados en la bitácora.
- `vitest.config.mts`: `fileParallelism: false` (los tests de integración comparten la BD local y se pisaban al correr en paralelo).
- Pruebas reales: `tests/hito32.test.ts` **10/10** (T02 anon no confirma, T04 HELD vigente, T05 vencida rechazada, T06 REPORTED no cuenta, T07 VERIFIED confirma, T08 sin adelanto bloqueada, T09 idempotente sin duplicar eventos, T11 gap de agenda respetado, T14 extensión acumulada, T16 auditoría); `tests/pagos-historial.test.ts` 4/4; total Vitest **46/46**; Playwright 6/6 admin + 11/11 públicos; typecheck/lint/build OK.
- Correcciones durante A2: T14 reservaba a las 18:00 pegado al servicio 17:00–18:00 y el gap de 15 min lo rechazaba correctamente (se mueve a 09:00); residuos de diagnóstico limpiados.
- Pendiente Hito 3.2-B (CMS integral por subetapas B1–B6, `docs/cms-plan.md`).
- **Sin commit** (pendiente de autorización del propietario; incluye A1 sin commitear).

## Hito 3.2-B1 — estructura del CMS (auditoría, modelo y RLS)

- Commit de cierre 3.2-A: **`f8bb641`** "feat(almae): completar reservas y adelantos hito 3.2-A" (sin push).
- Auditoría: no había tablas de contenido ni bucket Storage; `promotions` solo con `active`; catálogo público ya en BD (3.1); textos hardcodeados en `page.tsx`, `Footer`, `nosotros`, `terminos`.
- Migración `0016_cms_contenidos.sql` (aditiva, aplicada localmente): `media_assets`, `content_blocks` (draft/published), `content_revisions` (versionado genérico), `testimonials` (CHECK de consentimiento), columnas nuevas en `promotions` (`image_media_id`, `published`, `sort_order`).
- RLS: anon/autenticado solo filas published (testimonios con consentimiento); escritura `es_administrador()`; RPC `publicar_contenido` guarda revisión y devuelve path a revalidar (publicación sin rebuild).
- Pruebas reales: migración aplica con `ON_ERROR_STOP`; humo RLS con `set role anon`: drafts invisibles (0), tras publicar visibles (1); typecheck/lint/build OK.
- Pendiente B2–B6 (textos, Storage, servicios/promos, ubicación, vista previa/publicación) según `docs/cms-plan.md` §0.

## Hito 3.2-B2 — editor de textos y secciones

- Commit B1: **`3ad8624`** "feat(almae): estructura CMS y versionado B1".
- `/admin/contenidos`: lista por página (Inicio, Nosotros, Servicios, Contacto, FAQ, Pie) con estado (publicado/borrador/sin cambios) y fecha de última modificación en Lima; edición en `/admin/contenidos/[bloque]` y vista previa con selector escritorio/móvil en `/admin/contenidos/[bloque]/vista-previa` (solo admin).
- 10 bloques editables (`src/lib/cms/bloques.ts`): títulos, descripciones, textos, botones CTA, beneficios, pasos, FAQ, visibilidad de secciones y párrafos; sin enlaces arbitrarios (los href de CTA quedan fijos en código).
- Guardar borrador / publicar / cancelar: acciones server con sesión Supabase, validación Zod, saneado (sin `<`/`>`, sin caracteres de control, límites de longitud) y sin `dangerouslySetInnerHTML` (XSS imposible por render de texto). Al publicar se guarda revisión vía RPC `publicar_contenido` y `revalidatePath` por página (footer invalida el layout) — publicación sin rebuild.
- Público: home, Nosotros, Servicios, Contacto, FAQ y footer leen solo bloques **published** con fallback a los textos sembrados (migración `0017`, JSON con escapes Unicode); borradores invisibles para anon.
- Corrección de entorno: el canal de escritura corrompe acentos UTF-8 en archivos nuevos — `bloques.ts`, el seed 0017 y el spec e2e se regeneraron con escapes ASCII (`\uXXXX`); script `scripts/restaurar-contenidos-b2.mjs` + `scripts/contenidos-data.mjs` restauraron la BD (0 filas con `??`).
- Pruebas reales: Vitest **51/51** (`tests/cms-bloques.test.ts` 5/5: saneado, validación, defaults); Playwright CMS **4/4** (anon rechazado, borrador no visible, publicar + persistencia tras recarga, FAQ edit+restaurar, vista previa móvil/escritorio) + regresión 15/15 (fase1, reservas, admin-panel); typecheck/lint/build OK; BD verificada restaurada al texto original.
- URLs locales: edición `http://localhost:3001/admin/contenidos` (dev) · pública `http://localhost:3001/`.
- Pendiente B3: bucket `almae-media` (Storage) + galería `/admin/multimedia` (subida server-side, alt-text, uso, eliminación).
- **Sin commit** (pendiente de autorización para B2).
