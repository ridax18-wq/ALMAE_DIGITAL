# Índice de migraciones (0001–0013)

Regla: todo cambio de esquema va en `supabase/migrations/NNNN_nombre.sql` versionado. Nunca aplicar cambios solo desde el dashboard en producción.

| # | Archivo | Contenido |
|---|---|---|
| 0001 | `0001_enums.sql` | Enums base: `booking_status`, `admin_role`, `location`, `payment_status`, etc. |
| 0002 | `0002_tables.sql` | Tablas núcleo: patients, services, service_variants, bookings (con restricción de exclusión GiST), business_hours, business_settings, promotions, marketing_sources, payments, campaigns. |
| 0003 | `0003_rls.sql` | RLS básica + `es_administrador()` + índices y FK obligatorios. |
| 0004 | `0004_triggers.sql` | Triggers base (updated_at, validaciones). |
| 0005 | `0005_seed_demo.sql` | Semillas demo: servicios con precios reales, horarios L–V + sábado, settings, fuentes de marketing. |
| 0006 | `0006_funciones_reservas.sql` | RPCs del paciente v1: `crear_reserva_con_hold`, `obtener_reserva_por_token`, `cancelar_reserva_por_token`, `expirar_holds`. |
| 0007 | `0007_politica_adelanto.sql` | `advance_percent` (40% provisional) y fijación del adelanto en la reserva. |
| 0008 | `0008_modelo_definitivo.sql` | **Hito 2.2**: roles admin/professional/receptionist; `booking_origin` (WEB/IN_PERSON/ADMIN); renombrado de dinero a céntimos (`amount_cents`, `deposit_required_cents`, `deposit_cents`); `public_code` + token por hash (`access_token_hash`); `schedule_blocks`, `manual_payments`, `agenda_occupancy` (agenda unificada con EXCLUSION GiST); triggers `trg_ocupacion_booking` / `trg_ocupacion_bloqueo`; vista `bookings_resumen_economico`; retiro del trigger pago→confirmación. |
| 0009 | `0009_funciones_operativas.sql` | RPCs definitivas: `expirar_retenciones`, `crear_retencion_web` (ventana, horario ISO, descansos, excepciones, advisory lock, token 256 bits + hash, ALM-code), `obtener_reserva_por_token` (por hash), `cancelar_reserva_por_token`; matriz de transiciones vigente (sin transiciones de reembolso). |
| 0010 | `0010_operaciones_admin_rls.sql` | `es_owner_activo()`; `confirmar_reserva_admin` (lock FOR UPDATE, valida retención + horario + adelanto verificado); `extender_retencion` (cap max_hold_extension_minutes); `crear_reserva_presencial`; `crear_bloqueo_agenda` / `liberar_bloqueo_agenda`; RLS de schedule_blocks / manual_payments / agenda_occupancy. |
| 0011 | `0011_horarios_definitivos.sql` | `business_hours`: weekday → `day_of_week` ISO (1–7, 0→7 backfill), sin UNIQUE por día, `validar_semana_laboral()`. |
| 0012 | `0012_utilidades_ocupacion.sql` | `hay_conflicto_agenda(p_inicio, p_fin, p_excluir_booking, p_margen_min)` — utilidad de conflicto para reprogramaciones del panel. |
| 0013 | `0013_deposito_por_defecto.sql` | Depósito por defecto: si la variante no define `deposit_cents` y `advance_required_by_default` es true ⇒ `round(amount_cents * advance_percent / 100)`; `access_token`/`access_token_hash` nullable (presenciales sin token). |

## Comandos

```bash
npx supabase db reset                              # aplica todas las migraciones en local (borra datos)
node --env-file=.env.local scripts/crear-usuario-demo.mjs   # recrear usuario demo tras reset
npx supabase gen types typescript --local > src/types/database.ts  # regenerar tipos
```
