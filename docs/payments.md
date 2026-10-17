# Pagos — ALMAE DIGITAL 1.0

> Diseño orientado a: **nunca confirmar una cita sin pago acreditado y validado server-side.**

## 1. Principios

1. El importe del adelanto se **calcula y valida en el servidor**; el navegador no envía montos.
2. Adaptador desacoplado: la lógica de negocio no conoce la pasarela concreta.
3. Webhook como fuente de verdad + verificación activa (poll del cargo) como respaldo.
4. Idempotencia en toda la cadena (intento, webhook, conciliación).
5. Jamás almacenar número completo de tarjeta ni CVV.
6. Sandbox antes de producción; el simulador (`mock`) es exclusivo de desarrollo.

## 2. Interfaz del adaptador

```ts
interface PaymentGateway {
  createCharge(input: {
    bookingId: string;         // referencía
    amount: number;            // ya validado server-side, PEN
    description: string;       // texto no sensible
    customer: { phone: string; email?: string };  // datos mínimos
    returnUrl: string;         // /pagos/resultado (solo UX, no verdad)
    holdExpiresAt: Date;
  }): Promise<{ intentId: string; expiresAt: Date; redirectUrl: string }>;

  getCharge(intentId: string): Promise<ChargeStatus>;  // verificación activa
  parseWebhook(headers: Headers, rawBody: string): Promise<WebhookEvent>;  // valida firma
}
```

- `culqi.ts`: implementación con API REST de Culqi (docs vigentes en FASE 5 — se revalidan endpoints, firmas y formatos de webhook al momento de integrar; NADA se asume de memoria).
- `mock.ts`: simulador de desarrollo. Responde según parámetros (`success`, `fail`, `delay-expiry`). Guard: si `PAYMENTS_PROVIDER=mock` y `NEXT_PUBLIC_ENV=production` → error y abort.
- `manual.ts`: registro de pagos fuera de línea por el admin (efectivo/Yape), con evidencia y auditoría.

## 3. Flujo de cobro (feliz camino)

```
1. Paciente confirma slot  → POST /api/reservas (Zod + rate limit)
2. RPC crea patients+bookings(HELD, expires_at=+10min) + intent de pago CREATED/PENDING
3. UI redirige a pasarela (Culqi) con importe servidor-side
4. Culqi → webhook → /api/webhooks/culqi (firma validada)
5. match: provider_charge_id + booking_id + amount + currency == esperado
6. payments.SUCCEEDED → booking PENDING_PAYMENT→CONFIRMED (transición validada)
7. /pagos/resultado muestra estado REAL (verificado con getCharge si el webhook aún no llegó)
```

Pasos 4–6: si el webhook no llega en X segundos, la pantalla de resultado hace **poll server-side** de `getCharge`. Nunca se confía solo en `returnUrl`.

## 4. Casos límite obligatorios

| Caso | Comportamiento |
|---|---|
| Pago fallido | `payment.FAILED`; reserva vuelve a HELD si aún hay tiempo, o EXPIRED al vencer; slot NO se confirma |
| Hold expira sin pago | CRON marca EXPIRED; el slot queda libre; el pago tardío entra a conciliación |
| Pago acreditado DESPUÉS de expirar hold | `payment.RECONCILIATION` + fila en `payment_reconciliation(late_after_hold)`; admin reprograma (nueva reserva usando ese pago) o reembolsa; NUNCA auto-confirmar sobre hora ocupada |
| Monto/moneda disímiles | Rechazo del match → `RECONCILIATION(mismatch_amount)` |
| Webhook duplicado | UNIQUE `(provider, provider_event_id)`; el handler es no-op idempotente |
| Webhook fuera de orden (fail antes que success) | Último estado válido gana; eventos inmutables preservan historial |
| Reembolso | `REFUND_PENDING → REFUNDED` vía API del proveedor; reserva `CANCELLED/REFUND_PENDING → REFUNDED` |
| Cliente cierra el navegador tras pagar | El webhook confirma igualmente; el paciente puede verificar en `/reserva/[token]` |
| Doble clic en "pagar" | El intent se deduplica por `external_reference` |

## 5. Validación de match (checklist del webhook handler)

1. Firma/autenticidad válida (mecanismo vigente del proveedor).
2. `booking_id` existe y está en `HELD`/`PENDING_PAYMENT`.
3. `amount == bookings.advance_amount` y `currency == 'PEN'`.
4. `provider_charge_id` no registrado (o idempotente).
5. Estado real del cargo según el proveedor (`SUCCEEDED`).
6. Todo el flujo dentro de una transacción con bloqueo por `booking_id` (`SELECT ... FOR UPDATE`) para evitar carreras webhook↔poll.

## 6. Registro mínimo de pagos

`payments` guarda: id interno, booking_id, provider, id externo, monto, moneda, estado, método, fechas, últimos 4 dígitos, hash del payload del webhook. `payment_events` guarda el historial. Datos de tarjeta completos: **prohibidos**.

## 7. Conciliación

Bandeja en `/admin/pagos` (FASE 6) listando `payment_reconciliation` pendientes con: motivo, monto, teléfono, fecha; acciones: **reprogramar** (crea reserva nueva cobrando este pago ya acreditado) o **reembolsar** (API del proveedor). Cada resolución queda auditada.

## 8. Sin pasarela real activada

- FASE 4 usa exclusivamente `mock`.
- FASE 5 activa Culqi **sandbox** con credenciales del propietario.
- Pasarela real en producción requiere: credenciales válidas, pruebas ejecutadas y **autorización explícita del propietario**.
- Alternativas futuras: otro adaptador (interfaz ya definida); Yape/Plin como `manual` a corto plazo.
