# Base de datos — ALMAE DIGITAL 1.0

> PostgreSQL (Supabase). Todo cambio de esquema viaja en `supabase/migrations/NNNN_nombre.sql` versionado. Nada de cambios solo por dashboard.

## 0. Convenciones

- Identificadores internos: `uuid` (generados en BD `gen_random_uuid()`).
- Todas las marcas de tiempo: `timestamptz` (UTC en disco; se presenta en `America/Lima`).
- `updated_at` con trigger estándar `set_updated_at()`.
- Enums PostgreSQL para estados controlados.
- Todo índice foráneo explícito; índices adicionales por patrón de consulta.
- Dinero: `numeric(10,2)` + `currency char(3) DEFAULT 'PEN'`.
- Nombres: singular o plural consistente, `snake_case`.

## 1. Esquema inicial (migraciones FASE 2)

### 1.1 `business_settings` (singleton)

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | fijo |
| timezone | text | `America/Lima` fijo |
| currency | char(3) | `PEN` |
| booking_hold_ttl_minutes | int2 | default 10, 1–120 |
| booking_gap_minutes | int2 | buffer entre citas, default 15 |
| min_booking_lead_hours | int2 | antelación mínima para reservar |
| max_advance_days | int2 | horizonte de agenda visible |
| cancellation_policy_hours | int2 | límite para cancelar/reprogramar sin penalidad |
| whatsapp_number | text | contacto público `_DEMO` hasta confirmar |
| address_public | text | referencial `_DEMO` |
| updated_at | timestamptz | |

### 1.2 `admin_profiles`

| Columna | Tipo |
|---|---|
| user_id | uuid PK, FK → `auth.users(id)` |
| display_name | text |
| role | enum admin_role: `owner`, `assistant` |
| created_at, updated_at | timestamptz |

Sin políticas públicas. Gestión exclusiva service-role/supervisor.

### 1.3 `services`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | para URLs |
| name | text | |
| description | text | |
| duration_minutes | int2 | >0 |
| prep_buffer_minutes | int2 | prep adicional, default 0 |
| price | numeric(10,2) | >0 |
| advance_amount | numeric(10,2) | ≥0 y ≤ price |
| active | boolean | default true |
| instructions | text | instrucciones previas |
| image_url | text | opcional |
| sort_order | int2 | |
| created_at, updated_at | timestamptz | |

Índice parcial `(active) WHERE active`. El **precio y adelanto efectivos se calculan server-side**; el navegador solo muestra.

### 1.4 `service_images`

`id uuid PK · service_id FK · url text · alt text · sort_order int2`.

### 1.5 `business_hours`

Horario laboral semanal recurrente.

| Columna | Tipo |
|---|---|
| id | uuid PK |
| weekday | int2 0–6 (0=domingo, UTC-5 aplicado server-side) |
| opens_at / closes_at | time (hora local Lima) |
| break_start / break_end | time NULL (descanso dentro del rango) |

Restricción: `CHECK (opens_at < closes_at)`; una fila por weekday activo (UNIQUE weekday).

### 1.6 `schedule_exceptions`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| kind | enum exception_kind: `full_day`, `partial`, `holiday` | |
| date_from / date_to | date | feriados/vacaciones/bloqueos |
| time_from / time_to | time NULL | para `partial` |
| reason | text | visible al admin, no público |
| created_by, created_at | | |

### 1.7 `patients`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| full_name | text | |
| phone | text UNIQUE | canal principal |
| email | text NULL | |
| marketing_source_id | uuid FK NULL | origen inicial |
| contact_consent | boolean | base legal para mensajes |
| consent_at | timestamptz | |
| notes_admin | text | operativas, NO clínicas |
| created_at, updated_at | timestamptz | |

**No** se almacenará historia clínica, diagnóstico ni antecedentes en el MVP.

### 1.8 `bookings` — núcleo del sistema

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| service_id | uuid FK | |
| patient_id | uuid FK | |
| professional_id | uuid NULL | migración futura a `professionals`; singleton hoy |
| starts_at | timestamptz | inicio real de atención |
| ends_at | timestamptz | starts_at + duration |
| hold_range | tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED | para EXCLUDE |
| status | enum booking_status | ver §2 |
| access_token | text UNIQUE | ≥128 bits aleatorio, para `/reserva/[token]` |
| token_expires_at | timestamptz | caducidad de acciones del paciente |
| payment_status | enum payment_state | desnormalizado de último pago, solo lectura admin |
| total_amount | numeric(10,2) | precio vigente en el momento de reservar |
| advance_amount | numeric(10,2) | adelanto exigido |
| currency | char(3) | `PEN` |
| marketing_source_id | uuid FK NULL | |
| campaign_id | uuid FK NULL | |
| utm_source/medium/campaign | text | capturados del referer/link |
| notes | text | notas del paciente (libres, no clínicas) |
| created_at, updated_at, status_changed_at | timestamptz | |

**Anti-superposición (inviolable):**

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    hold_range WITH &&
  ) WHERE (status IN ('HELD','PENDING_PAYMENT','CONFIRMED'));
```

Índices: `(starts_at) WHERE status IN (activos)`, `(patient_id)`, `(service_id)`, `(status)`, `(access_token) UNIQUE`.

**Gap/buffer:** validado en la RPC (§3.2), no en la restricción (los huecos no son exclusiones).

### 1.9 `booking_events` (historial inmutable)

`id uuid PK · booking_id FK · from_status/to_status enum NULL · actor enum actor_type (`patient`,`admin`,`system`) · reason text · created_at`.
Trigger que escribe el evento en cada cambio de `status` de `bookings`.

### 1.10 `payments`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| booking_id | uuid FK NULL | puede existir pago sin reserva (conciliación) |
| provider | enum payment_provider: `culqi`, `mock`, `manual` | |
| provider_charge_id | text UNIQUE NULL | id externo, dedupe |
| external_reference | text | intent/reference nuestra |
| amount | numeric(10,2) | |
| currency | char(3) | |
| status | enum payment_state: `CREATED, PENDING, SUCCEEDED, FAILED, EXPIRED, REFUND_PENDING, REFUNDED, RECONCILIATION` | |
| method | text | tarjeta/Yape/manual… |
| raw_last4 | text NULL | solo últimos 4; NUNCA número completo ni CVV |
| occurred_at, created_at, updated_at | timestamptz | |
| reconciliation_note | text | para pagos tardíos |

Índice UNIQUE parcial `(provider_charge_id) WHERE provider_charge_id IS NOT NULL` → idempotencia.

### 1.11 `payment_events` (webhooks y transiciones)

`id uuid PK · payment_id FK · event_type text · provider_event_id text · payload_hash text · actor · created_at`.
UNIQUE `(provider, provider_event_id)` → **webhooks duplicados no insertan dos veces**.

### 1.12 `payment_reconciliation`

`id uuid PK · payment_id FK · detected_reason enum (`late_after_hold`,`mismatch_amount`,`orphan_charge`) · resolved_at NULL · resolved_by uuid NULL · resolution enum (`rebooked`,`refunded`,`kept`) · note text`.

### 1.13 `appointment_notifications`

Cola de notificaciones operativas: `id, booking_id FK, kind enum (`confirmation`,`reminder`,`rebooked`,`cancelled`), channel enum (`whatsapp`,`email`), status enum (`queued`,`sent`,`failed`,`skipped`), sent_at, error, created_at`. El envío automático llega en fase 8; la tabla existe desde el inicio.

### 1.14 Marketing

- `marketing_sources`: `id, name UNIQUE, kind enum (`whatsapp_group`,`instagram`,`referral`,`status`,`direct`,`other`), active, created_at`. Semillas `_DEMO`: "Condominio A (demo)", etc.
- `campaigns`: `id, marketing_source_id FK, name, utm_source, utm_medium, utm_campaign UNIQUE(tuple), start/end, active`.
- `promotions`: `id, code UNIQUE, kind enum (`fixed`,`percent`), value numeric(10,2), applies_to_service_id NULL, valid_from/valid_to, max_uses NULL, used_count, active`.

### 1.15 `audit_logs`

`id uuid PK · actor_user_id uuid NULL · actor_role · action text · entity text · entity_id uuid NULL · before jsonb NULL · after jsonb NULL · ip inet NULL · created_at`. Insertable solo por service-role; sin políticas públicas.

### 1.16 Tablas futuras (FASE 8, diseñadas hoy)

- `session_packages` (nombre, sesiones, precio, vigencia)
- `patient_packages` (paciente, paquete, sesiones_restantes, comprado_at, expira)
- `package_usage` (uso por cita)
- `reviews` (consentimiento explícito + `patient_consents`)
- `professionals` (cuando haya más de 1; `professional_id` ya existe en bookings)

## 2. Máquinas de estado

### booking_status

```
HELD ──(pago iniciado)──▶ PENDING_PAYMENT ──(webhook/verify OK)──▶ CONFIRMED
 │                            │
 │ (expira TTL)               │ (pago fallido/expirado)
 ▼                            ▼
EXPIRED                     (EXPIRED o vuelve a HELD si hay tiempo)
CONFIRMED ──▶ COMPLETED / NO_SHOW / CANCELLED / REFUND_PENDING ──▶ REFUNDED
CANCELLED y EXPIRED son estados finales de reserva (los eventos registran el motivo)
```

Transiciones válidas gobernadas por **check constraint `bookings_status_transitions`** en la RPC (tabla de pares), no por código cliente.

### payment_state (independiente)

`CREATED → PENDING → SUCCEEDED | FAILED | EXPIRED`; `SUCCEEDED → REFUND_PENDING → REFUNDED`; pago tardío sin reserva vigente → `RECONCILIATION`.

## 3. Integridad contra superposición (estrategia en capas)

1. **Capa 1 — restricción EXCLUDE** (§1.8): imposible físicamente doble-ocupar el intervalo de dos citas activas del mismo profesional.
2. **Capa 2 — RPC transaccional** `crear_reserva_con_hold(input jsonb) RETURNS jsonb`:
   - `BEGIN`; bloqueo advisory `pg_advisory_xact_lock(hashtext(professional_id::text || fecha_lima))` para serializar el día;
   - valida: servicio activo, horario laboral, excepciones/feriados, gap entre citas, antelación mínima, horizonte, datos del paciente (Zod ya validó en la app; revalida en SQL);
   - inserta `patients` (upsert por teléfono) y `bookings` con `status='HELD'`, `expires_at` calculado;
   - el `EXCLUDE` invalida si otro hold ganó la carrera → RPC devuelve error de disponibilidad;
   - `COMMIT`.
3. **Capa 3 — app server-side:** disponibilidad solo se calcula del lado servidor; la UI muestra slots y envía el intento, pero nunca decide.

**Expiración de holds:** job/CRON (o lazy check en cada lectura) que marca `EXPIRED` los `HELD`/`PENDING_PAYMENT` con `expires_at < now()`; liberados por la restricción EXCLUDE al salir del conjunto activo.

## 4. RLS (privilegios mínimos)

| Tabla | anon (key) | authenticated (admin) | service-role |
|---|---|---|---|
| services | SELECT solo `active` | SELECT/UPDATE/INSERT | todo |
| business_hours / schedule_exceptions | SELECT (usado por vista de disponibilidad) | CRUD | todo |
| patients | **sin políticas** | SELECT (dueño) | todo |
| bookings | **sin políticas** | SELECT/UPDATE acotado | todo |
| payments, payment_events, reconciliation, audit_logs, admin_profiles | **sin políticas** | SELECT (dueño) | todo |
| business_settings | SELECT columnas públicas | UPDATE dueño | todo |

- La creación de reservas del paciente **no** es un `INSERT` directo de anon: pasa por la RPC `security definer` que revalida todo.
- Vistas de disponibilidad: función SQL `disponibilidad(servicio, fecha)` `security definer` que devuelve **solo** horas, sin datos de otros pacientes.
- Verificación de RLS obligatoria en FASE 2 (script de pruebas con `anon`).

## 5. Retención y conservación

- `booking_events`/`payment_events`/`audit_logs`: inmutables, retención ≥ 3 años (política de conservación a confirmar con propietario).
- Anonimización de `patients` a solicitud del titular (Ley 29733): replace de nombre/teléfono/email y flag `anonymized_at`.
- Backup: Supabase backups automáticos del plan + dump manual documentado en `deployment.md`.
