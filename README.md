# ALMAE DIGITAL 1.0

Plataforma web comercial y operativa para **ALMAE**, consultorio de fisioterapia, rehabilitación y bienestar en Lima, Perú.

Convierte prospectos captados por grupos de WhatsApp de condominios en **pacientes con reservas confirmadas** mediante pago de adelanto.

> **Estado actual: FASE 0 completada** (auditoría y planificación). Ver [`docs/progress.md`](docs/progress.md).

---

## Características clave (MVP)

- Sitio público mobile-first, optimizado para apertura desde WhatsApp.
- Motor de reservas con disponibilidad en tiempo real (1 profesional, zona horaria `America/Lima`).
- Reservas temporales (holds) con expiración configurable (10 min por defecto).
- Pago de adelanto integrado con Culqi (sandbox primero) mediante adaptador desacoplado de pasarelas.
- Confirmación automática solo cuando el pago acreditado es validado por webhook/verificación server-side.
- Panel administrativo seguro (Supabase Auth) con agenda, pacientes, servicios, pagos y reportes.
- Seguimiento de origen comercial (UTM / campañas de condominios).
- WhatsApp contextual con mensajes prellenados.

## Stack

| Capa | Tecnología | Versión verificada |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 (latest) |
| UI | React + Tailwind CSS | 19.3.1 / 4.3.3 |
| Lenguaje | TypeScript (nativo, Go) | 7.0.2 |
| Backend/BD | Supabase (PostgreSQL, Auth, RLS) | supabase-js 2.118.0 / ssr 0.12.7 |
| Validación | Zod + React Hook Form | 4.6.7 / 7.90.0 |
| Tests | Vitest + Playwright | 5.0.5 / 1.64.1 |
| Calidad | ESLint + Prettier | 10.13.0 / 3.9.10 |
| Despliegue | Cloudflare Workers vía OpenNext | adapter 1.20.12 / wrangler 4.151.1 |

Justificación completa y riesgos de compatibilidad: [`docs/architecture.md`](docs/architecture.md).

## Estructura del repositorio

```
ALMAE_DIGITAL/
├── app/                      # Aplicación Next.js (se creará en FASE 1)
│   └── src/
│       ├── app/              # Rutas públicas, /admin, /api
│       ├── components/       # Componentes reutilizables accesibles
│       ├── lib/
│       │   ├── services/     # Lógica de negocio (reservas, disponibilidad, pagos)
│       │   ├── payments/     # Adaptador de pasarelas (interface + culqi + mock)
│       │   └── supabase/     # Clientes server/browser/SSR
│       └── types/            # Tipos generados de Supabase
├── docs/                     # Documentación del proyecto
├── supabase/
│   ├── migrations/           # SQL versionado (FASE 2)
│   └── functions/            # Edge functions auxiliares (si aplica)
├── e2e/                      # Pruebas Playwright (FASE 7)
├── .env.example
├── AGENTS.md
└── README.md
```

## Comandos

> Se implementarán al inicializar la aplicación en FASE 1. Referencia prevista:

| Comando | Descripción |
|---|---|
| `npm install` | Instalar dependencias |
| `npm run dev` | Servidor de desarrollo (http://localhost:3000) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript en modo estricto |
| `npm test` / `npm run test:watch` | Vitest (lógica y servicios) |
| `npm run test:e2e` | Playwright (flujo completo; autoinicia `next start` en el puerto 3127) |
| `npx supabase migration up` (local) | Aplicar migraciones |
| `npx opennextjs-cloudflare build && npx wrangler dev` | Preview de producción local (Cloudflare) |
| `npx opennextjs-cloudflare deploy` | Despliegue a Cloudflare Workers |

Para visualizar el sitio localmente tras un `npm run build`:

```bash
npm run build
npm run start      # http://localhost:3000
```

Capturas de pantalla de FASE 1 (375/768/1440 px) en [`docs/screenshots/`](docs/screenshots).

## Documentación

| Documento | Contenido |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Reglas de trabajo para agentes/humano colaboradores |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura, decisiones (ADRs) y riesgos técnicos |
| [`docs/requirements.md`](docs/requirements.md) | Requisitos funcionales y no funcionales |
| [`docs/roadmap.md`](docs/roadmap.md) | Fases 0–8 con criterios de aceptación |
| [`docs/database.md`](docs/database.md) | Modelo de datos, estados, RLS y anti-superposición |
| [`docs/security.md`](docs/security.md) | Seguridad, privacidad y Ley 29733 |
| [`docs/payments.md`](docs/payments.md) | Diseño de pagos (adaptador, Culqi, webhooks) |
| [`docs/deployment.md`](docs/deployment.md) | Despliegue y operación |
| [`docs/test-plan.md`](docs/test-plan.md) | Plan de pruebas |
| [`docs/progress.md`](docs/progress.md) | Registro de avance por fase |

## Reglas de oro

1. **Moneda PEN, zona horaria `America/Lima`.** Nunca calcular precios ni disponibilidad solo en el navegador.
2. **Datos de demostración identificados** hasta recibir datos reales del propietario (precios, contacto, dirección, identidad visual).
3. **Sin secretos en Git.** Configuración por `.env` (ver `.env.example`).
4. **Un módulo por vez**, con validaciones antes de pasar a la siguiente fase.
5. **No se afirma que algo está probado** si no se ejecutaron las pruebas correspondientes.
