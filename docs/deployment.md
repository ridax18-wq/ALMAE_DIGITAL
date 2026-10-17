# Despliegue y operación — ALMAE DIGITAL 1.0

> Meta: infraestructura de bajo costo, HTTPS, dominio propio y operable por una sola persona.

## 1. Topología

| Componente | Servicio | Región/Notas |
|---|---|---|
| App + API | Cloudflare Workers (OpenNext) | Global edge; workers + assets |
| Base de datos + Auth + Storage | Supabase | Proyecto región `sa-east-1` (São Paulo — la más cercana a Lima entre opciones disponibles) |
| Dominio + DNS + TLS | Cloudflare | DNS del dominio apunta al Worker; certificado automático |
| CI | GitHub Actions | Lint/typecheck/test/build + deploy de ensayo |
| CRON (expiración de holds) | Route handler + trigger externo | Cloudflare Cron Triggers o GitHub Actions schedule |

## 2. Requisitos del propietario (accesos externos)

1. **GitHub:** crear repositorio (privado) y conceder acceso.
2. **Supabase:** crear proyecto y compartir URL/anon key por canal seguro (no chat); crear el/los usuarios admin.
3. **Cloudflare:** cuenta y dominio propio (o registrarlo); token de API para despliegue.
4. **Culqi:** cuenta de comercio y llaves **sandbox**; producción solo cuando el propietario lo autorice.
5. **WhatsApp:** número de WhatsApp Business (para enlace `wa.me` inicial).

Ninguna de estas cuentas se crea desde el agente; ninguna credencial viaja por el chat ni por el repo.

## 3. Procedimiento de despliegue

```bash
# Local: verificar build adapta a Cloudflare
npx opennextjs-cloudflare build
npx wrangler dev          # preview con bindings reales

# Ensayo (staging): deploy a entorno de preview
npx opennextjs-cloudflare deploy --env preview

# Producción (solo con autorización del propietario)
npx opennextjs-cloudflare deploy --env production
```

`wrangler.toml/wrangler.jsonc` definirá: `compatibility_date ≥ 2024-09-23`, flag `nodejs_compat`, bindings de secrets, cron trigger, rutas de dominio.

## 4. Variables de entorno por entorno

| Entorno | Configuración |
|---|---|
| Desarrollo | `.env.local` (mock de pagos, Supabase local o proyecto dev) |
| Preview | Secrets de Cloudflare del entorno preview; `NEXT_PUBLIC_ENV=preview` |
| Producción | Secrets de Cloudflare del entorno production; `NEXT_PUBLIC_ENV=production`; `PAYMENTS_PROVIDER` según autorización |

Reglas: los `NEXT_PUBLIC_*` en producción apuntan al dominio real; los secretos (`SUPABASE_SERVICE_ROLE_KEY`, `CULQI_SECRET_KEY`, `CULQI_WEBHOOK_SECRET`, `CRON_SECRET`) solo en secrets del proveedor.

## 5. CI/CD (GitHub Actions, borrador)

```
main       → validar (lint+typecheck+test+build) → deploy preview
release/*  → validar → deploy producción (con aprobación manual)
```

- Los tests E2E de Playwright corren contra preview (FASE 7).
- Migraciones de producción: `supabase migration up` ejecutado por el propietario o vía CLI con token — **solo con autorización explícita**.

## 6. Operación

- **Backups:** backups automáticos de Supabase según plan + dump manual semanal documentado (`supabase db dump`).
- **Monitoreo:** logs de Workers (dashboard) + `wrangler tail`; alertas de errores 5xx; estado de Supabase.
- **Expiración de holds:** cron diario/minutero → `POST /api/cron/expire-holds` con `Authorization: Bearer CRON_SECRET`.
- **Incidentes:** runbook mínimo (a completar en FASE 7): qué hacer si la pasarela no responde, si la BD está caída, si un webhook no llega (poll manual desde admin).

## 7. Rollback

- Workers mantiene versiones: `wrangler rollback` o redeploy del SHA anterior.
- Base de datos: restaurar desde backup; migraciones son aditivas siempre que sea posible (nunca destructivas sin plan y respaldo).
- Documentar en cada release qué migración quedó aplicada.

## 8. Costos previstos (estimación cualitativa, sin cifras fijas)

- Cloudflare Workers: plan gratuito/bajo hasta superar límites; dominio propio es el costo principal.
- Supabase: plan gratuito inicial; plan pago si excede pausa/limits.
- Culqi: comisiones por transacción (tarifas oficiales del proveedor; el propietario las confirma).
