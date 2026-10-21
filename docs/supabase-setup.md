# Puesta en marcha de Supabase

## Local (stack Docker)

```bash
npx supabase start          # levanta el stack (API 54321, DB 54322, Studio 54323, Inbucket 54324)
npx supabase db reset       # aplica migraciones 0001–0013 (borra datos)
node --env-file=.env.local scripts/crear-usuario-demo.mjs   # usuario demo
node --env-file=.env.local scripts/verificar-rls.mjs        # 11 comprobaciones RLS
node --env-file=.env.local scripts/probar-motor.mjs         # concurrencia + token + expiración
```

- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon local), `SUPABASE_SERVICE_ROLE_KEY` (service local, solo server-side).
- Usuario demo: `admin@almae.demo` / `DemoAlmae2026` (solo stack local; NO usar en producción).
- Studio: http://127.0.0.1:54323 — para inspección; los cambios de esquema SIEMPRE por migraciones.

## Producción (proyecto Supabase remoto)

1. Crear el proyecto (región cercana a Perú).
2. Ejecutar migraciones con `npx supabase db push` (requiere autorización del propietario).
3. Configurar en Dashboard:
   - **Auth → URL Configuration**: Site URL del dominio real + redirect `/admin/recuperar`.
   - **Auth → Providers**: solo Email (sin registros self-service; deshabilitar sign-ups si el plan lo permite).
   - **Auth → Templates**: plantillas en español (ver abajo).
4. Variables de entorno en el proveedor de despliegue (nunca en el repo): URL/anon públicos y `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor.

## Plantillas de correo en español (Auth → Templates)

- **Reset de contraseña** (asunto: "Recupera tu acceso a ALMAE"):
  > Hola, recibimos una solicitud para restablecer tu contraseña de administración en ALMAE. Usa el botón para definir una nueva. Si no fuiste tú, ignora este mensaje. El enlace expira pronto por seguridad. — ALMAE Terapia y Spa
- **Confirmación de correo** (si se habilita): "Confirma tu correo de administración — ALMAE Terapia y Spa".

(El Dashboard de Supabase se administra en inglés; el idioma afecta solo a los correos y contenido visible al usuario final, que se personalizan en las plantillas.)

## Docker Desktop

El stack depende de Docker Desktop; si la máquina reinicia, levantar Docker y luego `npx supabase start`.
