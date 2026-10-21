# Adelantos manuales (sin pasarela web)

El pago **no** se realiza en la web. El paciente coordina el adelanto por WhatsApp y el administrador lo registra y verifica en el panel.

## Métodos soportados

`YAPE`, `PLIN`, `BANK_TRANSFER`, `CASH`, `OTHER` (enum `manual_payment_method`).

## Ciclo de vida (enum `manual_payment_state`)

| Estado | Significado | Acciones |
|---|---|---|
| REPORTED | El paciente declara haber pagado (o el admin lo anota) | Verificar / Rechazar |
| VERIFIED | Dinero confirmado en la cuenta | Habilita la confirmación de la cita |
| REJECTED | No se acredita (monto disímil, sin registro, error de origen) | Nota con motivo; no cuenta para confirmar |

## Reglas

- **Monto**: se registra en S/ (la BD guarda céntimos). El monto verificado acumulado debe alcanzar `bookings.deposit_required_cents` para habilitar "Confirmar cita".
- **Referencia**: al verificar se valida unicidad de `transaction_reference` entre VERIFIED (protección contra verificaciones duplicadas); una referencia ya usada se rechaza con mensaje claro.
- **Trazabilidad**: cada verificación/rechazo queda en `manual_payments` (`verified_at`, `verified_by`, `rejection_reason`) y en `audit_logs`.
- **Sin datos de tarjeta**: nunca se almacenan números de tarjeta ni CVV (no aplica — pagos fuera de línea).
- **Concilación futura (Culqi)**: la interfaz de pasarela permanece en `src/lib/payments/gateway.ts`; cuando se active Culqi, los pagos web conviven con los manuales bajo el mismo modelo de estados.

## Captura en el panel

- Reserva (detalle, HELD) → "Registrar adelanto manual" → método + monto + referencia + fecha declarada + observación → REPORTED → Verificar / Rechazar.
- Sección **Pagos** del panel: bandeja de todos los adelantos con acciones Verificar/Rechazar y filtro visual por estado.
