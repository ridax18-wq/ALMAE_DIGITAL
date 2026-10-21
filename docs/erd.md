# Modelo de datos definitivo (Hito 2.2)

Estado: aplicado localmente (migraciones 0008–0013). Identificadores internos UUID; todas las fechas `timestamptz`; dinero en **céntimos (integer)**.

## Diagrama (resumen textual)

```
patients 1──n bookings 1──1 service_variants n──1 services
   │              │
   │              ├──n booking_events (bitácora inmutable)
   │              ├──n manual_payments (adelantos manuales)
   │              └──1 agenda_occupancy (BOOKING, sincronizada por trigger)
   │
   └──0..1 marketing_source_id → marketing_sources

business_hours (día ISO 1–7, ventanas por día) → validadas al crear/cambiar estado
schedule_exceptions (día completo o parcial, holiday)
schedule_blocks (BREAK/INTERNAL/ABSENCE/MAINTENANCE/OTHER) → agenda_occupancy (BLOCK, trigger)
business_settings (parámetros operativos, fila única)
admin_profiles (roles: owner/admin/professional/receptionist, active)
audit_logs (bitácora de acciones del panel)
bookings_resumen_economico (vista: amount, deposit_required, verified, saldo)
```

## Tablas núcleo

### bookings
- `id`, `status` (enum `booking_status`: HELD, CONFIRMED, EXPIRED, CANCELLED, COMPLETED, NO_SHOW activos; PENDING_PAYMENT, REFUND_PENDING, REFUNDED quedan en el enum por historial pero **sin transiciones vigentes**), `origin` (WEB / IN_PERSON / ADMIN).
- `starts_at`, `ends_at`, `hold_range` (rango GiST interno), `hold_expires_at`, `token_expires_at`.
- `amount_cents`, `deposit_required_cents`, `deposit_verified_cents`, `currency` (PEN).
- `public_code` (formato `ALM-` + 12 caracteres, `unique`), `access_token` (nullable), `access_token_hash` (SHA-256 hex, único índice por hash).
- `confirmed_at`, `confirmed_by`, `cancellation_reason`, `notes`, `utm_*`, `marketing_source_id`.
- Anti-solape: restricción de exclusión `profesional_clave WITH =, hold_range WITH &&` (GiST), donde `profesional_clave` es columna generada (`'unico'` cuando hay cita, NULL para filas históricas).

### agenda_occupancy (agenda unificada)
- Fuente única de conflicto para web, panel y bloqueos.
- `occupancy_source` (BOOKING / BLOCK), `source_id`, `profesional_clave`, `rango` (tstzrange) + EXCLUSION GiST igual a bookings.
- Mantenida transaccionalmente por triggers `trg_ocupacion_booking` (insert/update/delete de bookings) y `trg_ocupacion_bloqueo` (schedule_blocks).

### manual_payments (adelanto sin pasarela)
- `booking_id`, `method` (YAPE / PLIN / BANK_TRANSFER / CASH / OTHER), `amount_cents`, `verification_status` (REPORTED / VERIFIED / REJECTED), `transaction_reference` (única entre VERIFIED, validación parcial de la aplicación), `paid_at`, `verified_at`, `verified_by`, `rejection_reason`, `notes`.

### schedule_blocks (bloqueos del panel)
- `block_type` (BREAK / INTERNAL / ABSENCE / MAINTENANCE / OTHER), `starts_at`, `ends_at`, `reason`.

### patients
- `full_name`, `phone` (único), `email`, `contact_consent` + `consent_at`, `notes_admin`, `marketing_source_id`.

### services / service_variants
- `services`: `slug` (único), `name`, `description`, `location` (consultorio / domicilio), `active`, `instructions` (jsonb), `sort_order`.
- `service_variants`: `duration_minutes`, `prep_buffer_minutes`, `amount_cents`, `deposit_cents` (nullable; NULL ⇒ usa % de `business_settings.advance_percent` con `advance_required_by_default`).

### business_hours / schedule_exceptions
- `business_hours`: `day_of_week` (ISO 1–7), `start_time`, `end_time` (varias ventanas por día).
- `schedule_exceptions`: `date`, `full_day` (bool), `holiday`, `start_time`/`end_time` (parciales).

### business_settings (fila única)
`booking_hold_ttl_minutes` (15), `booking_gap_minutes` (15), `min_booking_lead_hours` (3), `max_advance_days` (30), `cancellation_policy_hours` (24), `advance_percent` (40, provisional), `advance_required_by_default` (true), `max_hold_extension_minutes` (30), `whatsapp_number`, `address_public`.

## Bitácoras
- `booking_events`: transiciones de estado con actor (paciente / admin / sistema) y motivo.
- `audit_logs`: acciones del panel (quién, qué, entidad, before/after).
