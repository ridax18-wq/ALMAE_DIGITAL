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
