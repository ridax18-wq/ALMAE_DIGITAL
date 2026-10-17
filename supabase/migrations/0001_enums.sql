-- ALMAE DIGITAL — 0001: tipos enumerados del sistema
-- Estados separados: la reserva y el pago evolucionan de forma independiente.

create type admin_role as enum ('owner', 'assistant');

create type service_location as enum ('consultorio', 'domicilio');

create type exception_kind as enum ('full_day', 'partial', 'holiday');

create type booking_status as enum (
  'HELD',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'NO_SHOW',
  'REFUND_PENDING',
  'REFUNDED'
);

create type payment_state as enum (
  'CREATED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'EXPIRED',
  'REFUND_PENDING',
  'REFUNDED',
  'RECONCILIATION'
);

create type actor_type as enum ('patient', 'admin', 'system');

create type payment_provider as enum ('culqi', 'mock', 'manual');

create type notification_kind as enum ('confirmation', 'reminder', 'rebooked', 'cancelled');

create type notification_channel as enum ('whatsapp', 'email');

create type notification_status as enum ('queued', 'sent', 'failed', 'skipped');

create type marketing_source_kind as enum (
  'whatsapp_group',
  'instagram',
  'referral',
  'status',
  'direct',
  'other'
);

create type reconciliation_reason as enum ('late_after_hold', 'mismatch_amount', 'orphan_charge');

create type reconciliation_resolution as enum ('rebooked', 'refunded', 'kept');
