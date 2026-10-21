# Autenticación de administración

## Principios

- El paciente **nunca** crea contraseña: reserva por wizard + token de un solo enlace.
- Solo el personal se autentica: Supabase Auth (correo + contraseña) + verificación de perfil en `admin_profiles`.

## Flujo de acceso

- `/admin/login` — formulario es-PE ("Iniciar sesión"); errores traducidos (`src/lib/supabase/errores-auth.ts`): credenciales inválidas, correo no confirmado, límite de envío, etc. (nunca se exponen detalles internos).
- Tras autenticar, el layout de `(protegido)` verifica sesión y `esAdministrador(userId)` (tabla `admin_profiles`); si el usuario no figura, ve un aviso y no se le muestran datos.
- Acciones server (`"use server"`) re-verifican sesión antes de escribir; las RPCs admin usan `es_owner_activo()` como segunda barrera.

## Roles (`admin_role`)

- `owner` (dueño, control total), `admin`, `professional`, `receptionist` (agregados en 0008 para el CMS futuro). `active` (bool) permite deshabilitar accesos sin borrarlos.

## Recuperación de contraseña

1. En el login: **¿Olvidaste tu contraseña?** → formulario de correo (`solicitarRecuperacion`).
2. `resetPasswordForEmail` con `redirectTo: http(s)://<host>/admin/recuperar`.
3. Supabase envía el correo con código; la página `/admin/recuperar` hace `exchangeCodeForSession` y muestra el formulario de nueva contraseña (mín. 8 caracteres).
4. Al actualizar: se cierra la sesión y se redirige a `/admin/login?actualizada=1`.
5. En **Supabase Dashboard → Auth → URL Configuration** deben estar autorizadas `http://localhost:3000/admin/recuperar` (local) y `https://<dominio>/admin/recuperar` (producción).

## Plantillas de correo (español)

Configurar en Dashboard → Auth → Templates (ver `docs/supabase-setup.md` para los textos sugeridos).

## Rate limiting

- Rutas públicas mutantes (`/api/reservas`) y login: límite en memoria (`src/lib/services/rate-limit.ts`); para producción se recomienda Upstash (parámetro editable).
