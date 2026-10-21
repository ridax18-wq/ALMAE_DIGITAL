# Matriz RLS (Hito 2.2)

Principio: RLS activada en **todas** las tablas; `anon` solo lee lo estrictamente necesario; el acceso de escritura del panel pasa por RPCs `security definer` que validan `es_owner_activo()`.

| Tabla | anon | authenticated (owner activo) | service_role |
|---|---|---|---|
| services | SELECT (active = true) | full vía service client del panel | full |
| service_variants | SELECT (de servicios activos) | full | full |
| business_hours | SELECT | full | full |
| business_settings | SELECT (solo lectura de parámetros públicos) | SELECT (panel) | full |
| promotions | SELECT (activas) | — | full |
| schedule_blocks | sin políticas (sin acceso) | full (RLS owner) | full |
| manual_payments | sin políticas | full (RLS owner) | full |
| agenda_occupancy | sin políticas | SELECT/INSERT/UPDATE/DELETE owner | full |
| bookings | sin SELECT directo (el paciente va por token) | — (vía RPC) | full |
| patients | sin políticas | — (vía RPC) | full |
| booking_events | sin políticas | — | full |
| audit_logs | sin políticas | — | full |
| payments (legacy) | sin políticas (tabla sin uso en el flujo nuevo) | — | full |
| admin_profiles | sin SELECT público | SELECT (es_owner_activo vía definer) | full |

## RPCs públicas (anon)
- `crear_retencion_web` — valida todo server-side: servicio activo + ubicación consultorio, variante reservable, ventana (antelación/horizonte), horario del día ISO, descansos, excepciones, conflicto con `agenda_occupancy`, consentimiento del paciente; token de 256 bits solo se devuelve una vez.
- `obtener_reserva_por_token` — recibe el token plano, lo hashea y compara con `access_token_hash`; filtra `token_expires_at > now()`.
- `cancelar_reserva_por_token` — HELD siempre; CONFIRMED solo dentro de la política de cancelación.
- `expirar_retenciones` — **no pública** (solo service_role; los RPC web la invocan internamente).

## RPCs del panel (authenticated)
- `es_owner_activo()` — gate interno de todas las operaciones admin.
- `confirmar_reserva_admin`, `extender_retencion`, `crear_reserva_presencial`, `crear_bloqueo_agenda`, `liberar_bloqueo_agenda`, `hay_conflicto_agenda`, `validar_semana_laboral`.

## Verificación
`node --env-file=.env.local scripts/verificar-rls.mjs` — 11/11 comprobaciones ✓ (fase 2; re-ejecutar tras migraciones nuevas).
