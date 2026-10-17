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
