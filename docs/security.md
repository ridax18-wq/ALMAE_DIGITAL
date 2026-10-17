# Seguridad y privacidad — ALMAE DIGITAL 1.0

> Regla base: el servidor valida todo; el navegador nunca es fuente de verdad. Referencias legales: Ley N.° 29733 (Perú) y su reglamento vigente.

## 1. Superficies y controles

| Superficie | Amenaza principal | Control |
|---|---|---|
| Sitio público | XSS, inyección | React escapea por defecto; sin `dangerouslySetInnerHTML`; Zod en server; CSP estricta |
| `/reservar` (mutante) | Spam, abuso, doble envío | Rate limit por IP+acción, honeypot + desafío ligero, token idempotente del formulario |
| `/api/*` mutantes | Abuso | Rate limiting (Upstash si está configurado; memoria local si no) + Zod + ownership |
| `/reserva/[token]` | Enumeración, acceso a datos ajenos | Token aleatorio ≥128 bits (`crypto.randomBytes(32)` base64url), UNIQUE en BD, acciones limitadas, caducidad |
| `/admin/*` | Acceso no autorizado | Supabase Auth (cookie httpOnly); autorización server-side por layout y en cada route handler; RLS |
| Webhooks pasarela | Falsificación, replay | Validación de firma según mecanismo vigente del proveedor; idempotencia por id externo; sin confiar en la URL de retorno |
| Secrets | Fuga | `.env` no versionado; secretos del proveedor de despliegue; `service-role` solo en server; prohibido `NEXT_PUBLIC_` para secretos |

## 2. Autenticación y autorización

- **Administrador:** Supabase Auth email+password (MFA habilitable), sesiones por cookies httpOnly (`@supabase/ssr`), refresco de sesión en el layout servidor de `/admin` (evita middleware/proxy por compatibilidad Cloudflare — ver ADR-003).
- **Paciente:** sin cuenta. Cada reserva lleva `access_token` (alta entropía) con `token_expires_at`; el token solo expone SU reserva y acciones permitidas (ver/cancelar/solicitar reprogramación).
- **Autorización:** cada route handler de admin revalida rol (`admin_profiles.role`) — nunca confiar solo en el layout.
- Verificación de RLS en FASE 2: pruebas automatizadas con cliente `anon` intentando leer `patients`, `bookings`, `payments` (debe fallar) y `services` activos (debe permitir).

## 3. Protección de datos (Ley 29733)

- **Minimización:** solo nombre, teléfono (WhatsApp), email opcional, consentimiento. NO historia clínica, diagnósticos ni antecedentes en el MVP.
- **Consentimiento diferenciado:** casilla explícita para contacto comercial (WhatsApp/email), registrada con fecha (`contact_consent`, `consent_at`).
- **Derechos ARCO:** procedimiento documentado para acceso/rectificación/cancelación/oposición; anonimización técnica en BD (§5 de database.md).
- **No enviar datos de salud** a analítica/publicidad. Analítica mínima (opcional, sin PII) solo si el propietario la aprueba.
- **Aviso de privacidad** en `/privacidad` + aviso breve junto al formulario de reserva.

## 4. Cabeceras y transporte

- HTTPS obligatorio (Cloudflare termina TLS; HSTS activada).
- CSP: `default-src 'self'`; scripts solo self + inline nonce si necesario; `frame-ancestors 'none'`; `object-src 'none'`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima.
- Cookies de sesión: `httpOnly`, `Secure`, `SameSite=Lax`.

## 5. Rate limiting y antispam

- `POST /api/reservas`: p. ej. 5/min por IP y 3/día por teléfono normalizado (valores editables).
- Webhooks: solo tráfico verificado del proveedor.
- Honeypot en formularios públicos; tiempo mínimo de interacción.

## 6. Pagos

Ver [`docs/payments.md`](payments.md). Resumen: monto calculado server-side y validado contra BD; nunca montos desde el navegador; nunca almacenar número completo de tarjeta ni CVV; registro mínimo de conciliación (últimos 4 dígitos, id externo, estado).

## 7. Gestión de secretos

- Desarrollo: `.env.local` (no versionado) desde `.env.example`.
- Producción: variables/secrets en Cloudflare ( Workers secrets) — nunca en el repo ni en el chat.
- Rotación documentada: `CULQI_SECRET_KEY`, `CULQI_WEBHOOK_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- El propietario crea las cuentas externas y asigna las claves; **el agente nunca pide credenciales en el chat.**

## 8. Auditoría

- `booking_events`, `payment_events`: automáticos por triggers.
- `audit_logs`: acciones admin críticas (crear/editar servicios, cambiar estados, pagos manuales, conciliación, configuración).

## 9. Checklist de seguridad para producción (FASE 7)

- [ ] RLS verificada con pruebas automatizadas (anon no ve tablas privadas)
- [ ] Sin secretos en repo ni en cliente (`grep` de claves en `src/`)
- [ ] CSP + HSTS activas y verificadas
- [ ] Rate limiting activo en rutas mutantes
- [ ] Webhook con firma validada + idempotencia probada
- [ ] Tokens de reserva con caducidad funcionando
- [ ] MFA de admin habilitado (recomendado)
- [ ] Backups automáticos de BD verificados + dump manual probado
- [ ] Aviso de privacidad y consentimientos revisados por el propietario
- [ ] Simulador de pagos imposible de activar en producción (guard)
- [ ] Credenciales de prueba de la pasarela desactivadas/borradas
- [ ] Runbook de incidentes y contacto de emergencia documentado
