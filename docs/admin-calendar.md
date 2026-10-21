# Agenda del panel (día/semana)

## Vistas

- **Día**: lista de citas del día (estado, paciente, servicio, franja) + bloqueos visibles.
- **Semana**: grilla de los 7 días ISO con ocupación por hora.

## Orígenes en la agenda

- **Web** (nace HELD → se confirma manualmente).
- **Presencial** (nace CONFIRMED, origen IN_PERSON).
- **Bloqueos** (BREAK, INTERNAL, ABSENCE, MAINTENANCE, OTHER).

## Bloqueos de horario

- Crear desde la agenda (fecha + hora inicio/fin + tipo + motivo) vía RPC `crear_bloqueo_agenda`.
- El bloqueo entra a `agenda_occupancy` (source BLOCK) por trigger → bloquea la disponibilidad web automáticamente.
- Si el rango choca con citas existentes, la RPC rechaza con `conflicto_con_citas` y lista los conflictos (no borra nada).
- Retirar un bloqueo: `liberar_bloqueo_agenda` (requiere motivo en la UI).

## Nueva reserva presencial

- Formulario en la agenda: servicio, variante, fecha/hora, datos del paciente, motivo.
- RPC `crear_reserva_presencial`: nace CONFIRMED + origin IN_PERSON + `confirmed_by`; si el negocio requiere adelanto, se documenta la **exención** en el motivo (bitácora), no se exige verificación.

## Excepciones de calendario

- `schedule_exceptions` por fecha: día completo / festivo / parcial (rango de horas).
- Afectan la disponibilidad web y las validaciones de las RPCs (no se puede reservar ni reprogramar dentro de una excepción).
- Se administran junto con Horarios (`/admin/horarios`).

## Reprogramación

- Desde el detalle de la reserva (HELD o CONFIRMED): nueva fecha + hora → RPC `reprogramarReserva` valida conflicto con `hay_conflicto_agenda` antes de mover la cita (y por base de datos con la restricción de exclusión).
