# Flujo de reserva (retención 15 min + WhatsApp)

## Vista del paciente (web)

1. **`/reservar`** — wizard de 3 pasos: servicio → fecha y hora (disponibilidad calculada en el servidor) → datos (nombre, teléfono, consentimiento). Sin contraseñas.
2. Al confirmar, `POST /api/reservas` invoca la RPC `crear_retencion_web`:
   - valida servicio activo (solo consultorio), variante reservable, ventana, horario, descansos/excepciones y conflicto real en `agenda_occupancy`;
   - crea la reserva en estado **HELD** con vigencia de **15 minutos** (`business_settings.booking_hold_ttl_minutes`);
   - genera `public_code` (`ALM-XXXXXXXXXXXX`) y un token de 256 bits; en BD solo queda el **hash SHA-256**.
3. **`/reserva/<token>`** — página de la reserva:
   - estado "Horario separado — coordinando adelanto" con contador de la retención;
   - botón principal **WhatsApp "Coordinar adelanto"** con mensaje prellenado (código público, servicio, fecha y hora);
   - cancelación libre durante HELD; consulta posterior por el mismo enlace.

## Vista del administrador (panel)

4. El paciente paga el adelanto por Yape/Plin/transferencia/efectivo (coordinado por WhatsApp).
5. El admin abre **Reservas → detalle** y registra el adelanto manual (método, monto, referencia, fecha declarada) → queda **REPORTED**.
6. Al confirmar la recepción del dinero, pulsa **Verificar** → estado **VERIFIED** (con `verified_at`/`verified_by`).
7. Con retención vigente + adelanto verificado suficiente, el botón **Confirmar cita** se habilita → RPC `confirmar_reserva_admin`:
   - revalida retención vigente, disponibilidad del horario y suma verificada ≥ `deposit_required_cents`;
   - pasa la reserva a **CONFIRMED** (con `confirmed_at`/`confirmed_by`).
   Si la retención venció: **Extender retención** (máx. 30 min por operación, acumulable hasta `max_hold_extension_minutes`).

## Vencimientos

- CRON `/api/cron/expire-holds` marca HELD vencidas como **EXPIRED** (`expirar_retenciones`, idempotente); la disponibilidad también expira vencidas de forma lazy al consultarse.

## Atención presencial

- Desde la Agenda del panel: **Nueva reserva presencial** (`crear_reserva_presencial`) — nace CONFIRMED, origen IN_PERSON, sin token y con exención de adelanto documentada en el motivo.

## Reglas de integridad

- El solape se impide **en la base de datos** (restricciones de exclusión GiST sobre `agenda_occupancy` y bookings).
- Nunca se confirma una cita sin adelanto verificado (o exención explícita en presencial).
- La página del paciente muestra siempre el estado real desde el servidor (nunca lo que diga la URL).
