# Cómo abrir ALMAE Digital

## Iniciar

1. Doble clic en **INICIAR_ALMAE.bat** (raíz del proyecto).
2. Espera a que aparezca "LISTO". Se abrirá Chrome con la web.
3. Si el puerto 3000 está ocupado por otro programa, ALMAE usa el 3001 y lo indica en pantalla.

Requisitos: Node.js LTS instalado y, para reservas con datos reales, Docker Desktop con el stack local de Supabase (`npx supabase start`).

## Direcciones

- Web pública: `http://localhost:3000` o `http://localhost:3001` (la que muestre el lanzador).
- Login administrativo: la misma dirección + `/admin/login`.

## Detener

- Doble clic en **DETENER_ALMAE.bat**. Solo detiene el servidor de ALMAE, pide confirmación y nunca cierra otros programas.
- Alternativa: presiona `Ctrl+C` en la ventana "ALMAE Digital - Servidor".

## Desde Cursor

Menú *Terminal → Ejecutar tarea* → **ALMAE: iniciar** (o **ALMAE: detener**).

## Si localhost no abre

1. Revisa la ventana del servidor: muestra el error real.
2. Confirma que Docker Desktop está abierto y ejecuta `npx supabase start`.
3. Prueba la otra dirección (3000 ↔ 3001).

## Errores de Supabase

- "No pudimos completar la operación" o catálogo vacío: el stack local está caído. Inicia Docker Desktop y `npx supabase start`.
- Usuario demo (solo local): `admin@almae.demo`. Si no funciona tras un reset, ejecutar `node --env-file=.env.local scripts/crear-usuario-demo.mjs`.

## Diferencia entre ALMAE Web y Supabase Dashboard

- **ALMAE Web**: el sitio y el panel administrativo que usan pacientes y el propietario.
- **Supabase Dashboard / Studio** (`http://127.0.0.1:54323` en local): herramienta técnica de la base de datos. No se usa para operar el día a día.
