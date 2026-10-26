# Checklist de producción — ALMAE DIGITAL

> Marcar cada punto antes de declarar la publicación. Fuente: Hitos 4.1 y 4.2.

## Variables de entorno (Vercel > Settings)

- [ ] `.env.production.example` copiado al panel y completado (sin secretos en el repo)
- [ ] `NEXT_PUBLIC_ENV=production` (deshabilita cuenta demo y avisos locales)
- [ ] `NEXT_PUBLIC_SITE_URL=https://<dominio>` definitivo
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `ANON_KEY` del proyecto remoto
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo server-side (nunca `NEXT_PUBLIC_*`)
- [ ] `CRON_SECRET` generado (`openssl rand -hex 32`) y compartido con el cron
- [ ] `BOOKING_HOLD_TTL_MINUTES=15` y `booking_hold_ttl_minutes=15` en la BD
- [ ] `PAYMENTS_PROVIDER=mock` y llaves `CULQI_*` vacías (sin pagos web)
- [ ] `.env.local` NO versionado (verificar `.gitignore`)

## Cuentas y accesos

- [ ] Cuenta demo `admin@almae.demo` **no existe** en Supabase Cloud (el bloqueo de login en producción es una red de seguridad, no sustituye borrarla)
- [ ] Creada la cuenta real del propietario con contraseña fuerte y MFA si está disponible
- [ ] Revisado `admin_profiles` (solo el propietario activo)
- [ ] Eliminados usuarios de prueba creados por scripts (`scripts/crear-usuario-demo.mjs` NO ejecutar en producción)

## Datos ficticios

- [ ] Revisados los seeds `_DEMO` de `0005_seed_demo.sql`: eliminados o reemplazados por datos oficiales (ejecutar `scripts/limpiar-demo.sql` con `-v ON_ERROR_STOP=1 -v confirmar_limpieza_demo=1`; por defecto el script **aborta**)
- [ ] Testimonios: solo con consentimiento real (o sección deshabilitada)
- [ ] Fotos: placeholders reemplazados; sin imágenes que representen falsamente al personal
- [ ] Teléfonos/precios oficiales verificados por el propietario

## Supabase Cloud

- [ ] Migraciones 0001–0024 aplicadas en orden, con `pg_dump` previo
- [ ] `npx supabase gen types` regenerado y commiteado (con autorización)
- [ ] `scripts/verificar-rls.mjs` PASS contra el remoto
- [ ] RLS deny-all en `bookings_valid_transitions` (0024) verificada
- [ ] Auth: SMTP propio configurado; `SITE_URL` correcto; confirmación de correo activa
- [ ] Storage: bucket y políticas 0018 verificados; URLs públicas correctas
- [ ] Backup automático (7 días en Pro) + dump semanal programado
- [ ] Respaldo independiente de Storage: `node scripts/backup-storage.mjs` completado
- [ ] Proyecto con spend cap y alertas de uso

## Aplicación

- [ ] `npm run build` limpio en el entorno de Vercel (Node ≥20.9)
- [ ] `vercel.json` con cron `* * * * *` → `/api/cron/expire-holds` (Pro)
- [ ] Rate limiting: decidir Upstash (requiere autorización) o aceptar límite por instancia
- [ ] Errores: Vercel Logs/Error Monitoring activado y probado (ver un error forzado)
- [ ] Límite de body 6mb revisado para subidas de imágenes

## Dominio y DNS

- [ ] Dominio comprado (decidir `.pe` vs `.com`)
- [ ] Registro A/CNAME apuntando al host; HTTPS con certificado automático
- [ ] WWW y apex redirigen a `https://<dominio>`
- [ ] Correo transaccional (SMTP) probado: recuperación de contraseña recibe el correo

## Protección de datos (personas)

- [ ] Minimización: solo nombre, teléfono y datos necesarios del paciente
- [ ] Acceso administrativo limitado al propietario (RLS + `es_owner_activo`)
- [ ] Aviso de privacidad publicado (página de contacto o footer)
- [ ] Consentimiento documentado para testimonios y fotos
- [ ] Retención/eliminación: definir política de borrado de datos de pacientes con el propietario (pendiente legal)

## Pruebas antes de publicar

- [ ] `node scripts/verificar-sin-demo.mjs` con `NEXT_PUBLIC_ENV=production` → PASS (sin datos demo)
- [ ] Suite e2e completa PASS en el entorno de staging/build final
- [ ] Smoke test manual: reserva web → HELD → expiración a los 15 min → agenda
- [ ] Login del propietario, agenda día/semana, CMS, WhatsApp
- [ ] Móvil responsive revisado en el dominio real

## Pendientes que requieren autorización

- [ ] Contratar Vercel Pro / Supabase Pro / dominio / SMTP
- [ ] Habilitar Upstash para rate limiting distribuido
- [ ] Habilitar pagos web (Culqi) — fuera del alcance actual
- [ ] Programar dumps propios de respaldo
