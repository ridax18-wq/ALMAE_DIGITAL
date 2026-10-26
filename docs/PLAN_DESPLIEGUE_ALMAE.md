# Plan de despliegue — ALMAE DIGITAL

> Preparado en el Hito 4.2. **No se ha contratado nada, no hay push, no hay migraciones remotas.**
> Arquitectura recomendada (Hito 4.1): **Vercel Pro + Supabase Cloud Pro + dominio**.

## 1. Orden de ejecución (etapas)

| Etapa | Acción | Requiere autorización |
|---|---|---|
| 0 | Crear cuentas: Vercel, Supabase, registrador de dominio | Sí (pagos) |
| 1 | Supabase Cloud: crear proyecto, aplicar migraciones 0001–0024 en orden (CLI: `supabase db push` o psql en orden), verificar RLS con `scripts/verificar-rls.mjs` | Sí (migración remota) |
| 2 | Regenerar tipos: `npx supabase gen types typescript --project-id <ref> > src/types/database.ts` y revisar diff | No |
| 3 | Auth: configurar SMTP propio (Supabase Auth > SMTP), URL de sitio `https://<dominio>`, deshabilitar proveedores innecesarios | Sí (contratar SMTP) |
| 4 | Storage: verificar bucket `almae-media` y políticas de la migración 0018; imágenes en HTTPS | No |
| 5 | Sembrar datos reales (servicios, horarios, ubicación) y **crear la cuenta del propietario real** con contraseña fuerte; verificar que `admin@almae.demo` NO existe | Sí (datos oficiales) |
| 6 | Vercel: importar repo, definir variables de `.env.production.example`, `NEXT_PUBLIC_ENV=production`, build `npm run build`, Node 20+ | Sí (plan Pro) |
| 7 | Cron: `vercel.json` llama a `/api/cron/expire-holds` cada minuto con `Authorization: Bearer $CRON_SECRET` (en Vercel Pro; ver nota §4) | No |
| 8 | Dominio: apuntar DNS (A/CNAME) al proyecto, HTTPS automático, fijar `NEXT_PUBLIC_SITE_URL` | Sí (comprar dominio) |
| 9 | Smoke test en producción: home, wizard, HELD 15 min, expiración por cron, login del propietario, agenda, CMS | No |
| 10 | Backups: habilitar PITR/backup de Supabase Pro + dump semanal programado propio | Sí (definir alcance) |

## 2. Migraciones (0001–0024)

- Aplicar **en orden estricto**, una sola vez, con respaldo previo (`pg_dump`) antes de empezar.
- `0005_seed_demo.sql` crea datos `_DEMO`; en producción: eliminarlos después de sembrar datos reales (ver CHECKLIST).
- `0024` endurece `bookings_valid_transitions` (obligatoria).
- Rollback: por migración, conservando el `pg_dump` previo; no existe "down" automático → el plan de restauración es el dump.

## 3. Protección del motor de reservas

- Retención HELD: **15 minutos** (`business_settings.booking_hold_ttl_minutes = 15`); validada en servidor y en BD.
- Expiración: `expirar_retenciones()` corre en cada operación (lazy) **y** por cron cada minuto (`/api/cron/expire-holds`, Bearer `CRON_SECRET`).
- Solapes: exclusión `agenda_occupancy` + `hay_conflicto_agenda` en la BD (no se puede saltar desde el navegador).
- RPCs administrativas: `es_owner_activo()`; anon sin `execute`.

## 4. Notas técnicas

- **Rate limiting**: hoy en memoria (por instancia). Con `UPSTASH_REDIS_REST_URL/TOKEN` definidas queda pendiente de implementar la rama distribuida (plan gratuito de Upstash; requiere autorización para contratar).
- **Cron en Vercel**: Hobby solo permite 1 ejecución/día; el plan Pro permite cada minuto (requiere Pro).
- **Variables**: solo `NEXT_PUBLIC_*` llegan al navegador; `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` solo server-side.
- **Pagos**: `PAYMENTS_PROVIDER=mock` sin llaves; habilitar Culqi es una decisión explícita aparte.

## 5. Costos (verificados en el Hito 4.1)

- Vercel Pro: US$20/mes · Supabase Pro: US$25/mes · Dominio `.pe`: S/110–200/año (`.com`: S/50–80/año) · SMTP: pendiente de cotización · Respaldos: incluidos 7 días en Pro (dump propio: pendiente de cotización).

## 6. Rate limiting distribuido (propuesta para 4.4)

En Vercel el rate limit actual en memoria se reinicia en cada invocación serverless y no cubre réplicas: no es fiable en producción.

- **Propuesta**: Upstash Redis (REST), compatible con serverless. Variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (solo server-side). Plan gratuito suficiente para el volumen de un solo profesional.
- **Implementación**: en `src/lib/services/rate-limit.ts`, si las variables existen usar `INCR` + `EXPIRE` vía REST (ventana fija) conservando la API síncrona actual (`limitarLlamadas`); si no existen, mantener el contador en memoria (compatibilidad total, cero roturas).
- **Umbrales propuestos**: `/api/disponibilidad` 30/min por IP, `/api/reservas` 10/min por IP; `/api/cron/expire-holds` ya protegido con `CRON_SECRET`.
- **Requiere autorización**: contratar/configurar Upstash e implementar la rama distribuida (hito posterior).
