# SaaS Flow — Subscription & Billing Platform

> Plataforma SaaS para gestión de suscripciones y facturación, construida sobre Arquitectura Hexagonal, SOLID, y los patrones Repository, Strategy y Factory.

---

## Tabla de contenidos

1. [Descripción del proyecto](#descripción-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Diagrama de capas](#diagrama-de-capas)
4. [Stack tecnológico](#stack-tecnológico)
5. [Estructura del proyecto](#estructura-del-proyecto)
6. [Instalación](#instalación)
7. [Variables de entorno](#variables-de-entorno)
8. [Scripts disponibles](#scripts-disponibles)
9. [Endpoints de la API](#endpoints-de-la-api)
10. [Patrones de diseño implementados](#patrones-de-diseño-implementados)
11. [Decisiones arquitectónicas](#decisiones-arquitectónicas)
12. [Descripción de la UI](#descripción-de-la-ui)
13. [Ejecución de tests](#ejecución-de-tests)
14. [AI Assisted Development](#ai-assisted-development)

---

## Descripción del proyecto

SaaS Flow es una plataforma fullstack para la gestión de suscripciones y facturación automática con dos roles: **ADMIN** y **CLIENT**.

### Funcionalidades principales

| Rol   | Capacidades |
|-------|------------|
| ADMIN | CRUD de planes (BRONZE / SILVER / GOLD), crear suscripciones, ver todas las facturas, dashboard de métricas |
| CLIENT | Ver suscripción activa, ver sus facturas, pagar facturas |

**Reglas de negocio clave:**
- Un usuario solo puede tener **una suscripción ACTIVE** simultánea.
- Al crear una suscripción se genera automáticamente una factura usando `BillingStrategyFactory`.
- Las suscripciones con `endDate` pasado se marcan como `EXPIRED` en el primer acceso al middleware de control.
- El acceso a endpoints premium requiere suscripción activa (middleware `checkSubscriptionStatus`).

---

## Arquitectura

El proyecto implementa **Arquitectura Hexagonal (Ports & Adapters)** con separación estricta de capas:

- **Domain** — núcleo de negocio puro, sin dependencias externas.
- **Application** — orquestación de casos de uso, puertos y DTOs.
- **Infrastructure** — adaptadores de Prisma, JWT, bcrypt y Winston.
- **Interfaces** — adaptadores HTTP (Express controllers, routes, middlewares).

La regla cardinal es: **las dependencias solo apuntan hacia adentro** (interfaces → application → domain). Infraestructura implementa los puertos del dominio.

---

## Diagrama de capas

```
┌──────────────────────────────────────────────────────────────────────┐
│                        interfaces/http                                │
│   AuthController · PlansController · SubscriptionsController         │
│   InvoicesController · DashboardController                           │
│   authenticateJWT · authorizeRole · checkSubscriptionStatus          │
│   globalErrorHandler · requestLogger · AppContainer (wiring)         │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ usa (inyecta interfaces)
┌──────────────────────────▼───────────────────────────────────────────┐
│                         application                                   │
│   Use Cases: LoginUseCase · RegisterUseCase · CreatePlanUseCase      │
│              CreateSubscriptionUseCase · GenerateInvoiceUseCase       │
│              PayInvoiceUseCase · ExpireSubscriptionUseCase · …       │
│   Ports: ITokenService · IPasswordService                            │
│   DTOs: LoginRequestDto · CreatePlanDto · SubscriptionResponseDto … │
│   Mappers: planMapper · subscriptionMapper · invoiceMapper           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ depende de (interfaces puras)
┌──────────────────────────▼───────────────────────────────────────────┐
│                           domain                                      │
│   Entities: User · Plan · Subscription · Invoice                     │
│   Repository interfaces: IUserRepository · IPlanRepository ·         │
│                          ISubscriptionRepository · IInvoiceRepository│
│   Strategies: BillingStrategy (I) · Bronze · Silver · Gold          │
│   Factory: BillingStrategyFactory                                    │
│   Errors: DomainError · AuthErrors · UserErrors · …                 │
│   Enums: UserRole · PlanName · SubscriptionStatus · InvoiceStatus   │
└──────────────────────────────────────────────────────────────────────┘
                           ▲ implementa
┌──────────────────────────┴───────────────────────────────────────────┐
│                       infrastructure                                  │
│   Repositories: PrismaUserRepository · PrismaPlanRepository          │
│                 PrismaSubscriptionRepository · PrismaInvoiceRepository│
│   Auth: JwtTokenService · BcryptPasswordService                      │
│   Logging: Winston (logger · authLogger · subscriptionLogger · …)   │
│   DB: PrismaClient singleton                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

### Backend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | ≥ 18 | Runtime |
| TypeScript | ^5.3 | Tipado estricto |
| Express | ^4.18 | Framework HTTP |
| Prisma | ^5.7 | ORM + migraciones |
| PostgreSQL | cualquiera | Base de datos |
| JWT (`jsonwebtoken`) | ^9.0 | Autenticación |
| bcryptjs | ^2.4 | Hash de contraseñas |
| Zod | ^3.22 | Validación de DTOs |
| Winston | ^3.11 | Logging estructurado |
| Vitest | ^1.0 | Tests unitarios |

### Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | ^18.2 | UI library |
| TypeScript | ^5.3 | Tipado estricto |
| Vite | ^5.0 | Build tool |
| Material UI | ^5.15 | Design system |
| MUI X DataGrid | ^6.18 | Tablas avanzadas |
| React Router | ^6.21 | Enrutamiento |
| Axios | ^1.6 | HTTP client |

---

## Estructura del proyecto

```
/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── __tests__/          # Tests unitarios
│   │   ├── domain/
│   │   │   ├── entities/       # User, Plan, Subscription, Invoice
│   │   │   ├── enums.ts
│   │   │   ├── errors/         # DomainError + específicos por entidad
│   │   │   ├── factories/      # BillingStrategyFactory
│   │   │   ├── repositories/   # Interfaces IXRepository
│   │   │   └── strategies/     # BillingStrategy + Bronze/Silver/Gold
│   │   ├── application/
│   │   │   ├── dtos/           # Request/Response DTOs con Zod
│   │   │   ├── mappers/        # entity → DTO
│   │   │   ├── ports/          # ITokenService, IPasswordService
│   │   │   └── use-cases/      # 17 casos de uso
│   │   ├── infrastructure/
│   │   │   ├── auth/           # JwtTokenService, BcryptPasswordService
│   │   │   ├── database/       # Prisma client singleton
│   │   │   ├── logging/        # Winston logger + child loggers
│   │   │   └── repositories/   # PrismaXRepository (4 adaptadores)
│   │   └── interfaces/http/
│   │       ├── container.ts    # Composition root (único new de concretos)
│   │       ├── controllers/    # 5 controllers (thin)
│   │       ├── helpers/        # apiResponse envelope
│   │       ├── middlewares/    # authenticateJWT, authorizeRole,
│   │       │                   # checkSubscriptionStatus, errorHandler
│   │       ├── routes/         # 5 router factories + index
│   │       └── types/          # Express.Request augmentation
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
└── frontend/
    ├── src/
    │   ├── api/                # Axios instance + 5 service files
    │   ├── components/
    │   │   ├── common/         # StatusChip, PageHeader, TableSkeleton
    │   │   └── layout/         # AppShell, Sidebar, TopBar
    │   ├── contexts/           # AuthContext, SnackbarContext
    │   ├── hooks/              # useAuth, useSnackbar
    │   ├── pages/              # Login, Dashboard, Plans, Subscriptions, Invoices
    │   ├── router/             # AppRouter, ProtectedRoute
    │   ├── theme/              # MUI createTheme (paleta ADR)
    │   └── types/              # Tipos compartidos
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## Arranque rápido

> 5 pasos para tener el proyecto completamente funcional con datos de prueba.

### Prerrequisitos

- Node.js ≥ 18
- PostgreSQL en ejecución
- npm ≥ 9

### Paso 1 — Crear la base de datos

```bash
createdb saas_flow
```

### Paso 2 — Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Editar `.env` con la URL de la base de datos y un JWT secret:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/saas_flow"
JWT_SECRET="saasflow_dev_secret_key_change_in_production"
JWT_EXPIRES_IN="24h"
PORT=3000
NODE_ENV=development
```

### Paso 3 — Inicializar BD y cargar datos de prueba

```bash
npm run db:init
```

Este comando ejecuta en secuencia:
1. `prisma migrate dev --name init` — crea tablas, enums e índices.
2. `prisma db seed` — inserta admin, cliente y los 3 planes.

### Paso 4 — Levantar el backend

```bash
npm run dev
```

### Paso 5 — Levantar el frontend

```bash
cd ../frontend
npm install
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:3000/api
npm run dev
```

**Backend:** `http://localhost:3000` · **Frontend:** `http://localhost:5173`

---

## Credenciales de prueba

Creadas automáticamente por `npm run db:init`.

| Rol | Email | Contraseña |
|-----|-------|-----------|
| **ADMIN** | `admin@saasflow.com` | `Admin123!` |
| **CLIENT** | `client@saasflow.com` | `Client123!` |

### Planes creados

| Tier | Precio | Descripción |
|------|--------|-------------|
| BRONZE | $9.99 | Essential access — core platform features |
| SILVER | $19.99 | Standard access — enhanced features and higher limits |
| GOLD | $39.99 | Full access — all premium features and priority support |

> **Flujo de demo recomendado:**
> 1. Login como **ADMIN** → crear una suscripción SILVER para el CLIENT (`client@saasflow.com`).
> 2. Login como **CLIENT** → ver la suscripción activa y la factura generada.
> 3. Pagar la factura desde la página de Invoices.
> 4. Volver al ADMIN → verificar el Dashboard actualizado.

---

## Instalación

Para mayor detalle sobre la configuración manual, ver las secciones siguientes.

---

## Variables de entorno

### Backend (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/saas_flow` |
| `JWT_SECRET` | Clave secreta para firmar JWT | `super_secret_key_min_32_chars` |
| `JWT_EXPIRES_IN` | Duración del token | `24h` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `LOG_LEVEL` | Nivel de logs Winston | `info` |

### Frontend (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | URL base de la API | `http://localhost:3000/api` |

---

## Scripts disponibles

### Backend

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Init BD** | `npm run db:init` | Migra la BD y ejecuta el seed (primer uso) |
| **Reset BD** | `npm run db:reset` | Borra y recrea la BD + migraciones + seed |
| **Seed** | `npm run seed` | Solo ejecuta el seed (idempotente) |
| Desarrollo | `npm run dev` | ts-node-dev con hot reload |
| Build | `npm run build` | Compila TypeScript a `dist/` |
| Producción | `npm start` | Ejecuta `dist/index.js` |
| Tests | `npm test` | Ejecuta todos los tests con Vitest |
| Tests con cobertura | `npm run test:coverage` | Genera reporte en `coverage/` |
| Lint | `npm run lint` | ESLint sobre `src/` |
| Formato | `npm run format` | Prettier sobre `src/` |
| Prisma migrate | `npm run prisma:migrate` | Aplica migraciones pendientes |
| Prisma Studio | `npm run prisma:studio` | UI visual de la BD |

### Frontend

| Script | Comando | Descripción |
|--------|---------|-------------|
| Desarrollo | `npm run dev` | Vite dev server en puerto 5173 |
| Build | `npm run build` | Compila para producción |
| Preview | `npm run preview` | Preview del build |
| Lint | `npm run lint` | ESLint sobre `src/` |

---

## Endpoints de la API

Base URL: `/api`

### Autenticación

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/auth/register` | Público | Registrar nuevo usuario CLIENT |
| `POST` | `/auth/login` | Público | Login → retorna JWT |

### Planes

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/plans` | Autenticado | Listar todos los planes |
| `GET` | `/plans/:id` | Autenticado | Obtener plan por ID |
| `POST` | `/plans` | ADMIN | Crear plan |
| `PUT` | `/plans/:id` | ADMIN | Actualizar precio/descripción |
| `DELETE` | `/plans/:id` | ADMIN | Eliminar plan |

### Suscripciones

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/subscriptions` | ADMIN | Crear suscripción (genera factura automáticamente) |
| `GET` | `/subscriptions` | ADMIN | Listar todas las suscripciones |
| `GET` | `/subscriptions/me` | CLIENT | Ver suscripción activa propia |

### Facturas

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/invoices` | ADMIN | Listar todas las facturas |
| `GET` | `/invoices/me` | CLIENT + checkSubscription | Ver facturas propias |
| `PATCH` | `/invoices/:id/pay` | CLIENT | Pagar factura (PENDING/OVERDUE → PAID) |

### Dashboard

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/dashboard` | ADMIN | Métricas agregadas de la plataforma |

### Health

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/health` | Público | Status del servidor |

### Formato de respuesta estándar

```json
// Éxito
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "...", "errors": { "field": ["..."] } }
```

---

## Patrones de diseño implementados

### Repository Pattern

**Ubicación:** `domain/repositories/IXRepository.ts` (puertos) + `infrastructure/repositories/PrismaXRepository.ts` (adaptadores)

Las interfaces de repositorio pertenecen al dominio y definen el contrato de persistencia. Los adaptadores Prisma implementan esas interfaces. El dominio nunca importa de `@prisma/client`.

```
IUserRepository (domain/repositories)
    ↑ implementado por
PrismaUserRepository (infrastructure/repositories)
```

### Strategy Pattern

**Ubicación:** `domain/strategies/`

Encapsula el cálculo del monto de factura por tier. Cada estrategia es una clase independiente (OCP: agregar PLATINUM no modifica las existentes).

| Estrategia | Cálculo |
|-----------|---------|
| `BronzeBillingStrategy` | `plan.price × 1.00` |
| `SilverBillingStrategy` | `plan.price × 1.05` |
| `GoldBillingStrategy` | `plan.price × 1.10` |

### Factory Pattern

**Ubicación:** `domain/factories/BillingStrategyFactory.ts`

Centraliza la creación de estrategias por `PlanName`. Los casos de uso llaman `BillingStrategyFactory.create(plan.name)` sin conocer qué estrategia concreta se instancia.

### Hexagonal Architecture (Ports & Adapters)

La regla de dependencia se verifica con los imports: ningún archivo en `domain/` importa de `infrastructure/`, `interfaces/` o librerías externas. El `container.ts` es el único "composition root" donde se instancian concretos.

---

## Decisiones arquitectónicas

| Decisión | Alternativa descartada | Razón |
|---------|----------------------|-------|
| Sin DI framework (InversifyJS, tsyringe) | DI automático | Complejidad innecesaria para este scope; el container manual es auditable |
| Sin CQRS | Separar reads/writes | Sobreingeniería; los use cases ya separan responsabilidades |
| Sin Event Sourcing | Eventos de dominio | Scope no lo requiere; añadiría complejidad sin beneficio visible |
| Sin Redis | Cache de sesión/suscripción | ADR lo excluye explícitamente |
| Sin microservicios | Servicios separados por dominio | Monolito modular es suficiente y más simple de sostener |
| `@@index` en lugar de `@@unique([userId, status])` | Constraint de BD | El constraint impedía múltiples EXPIRED históricos; la regla de negocio vive en `CreateSubscriptionUseCase.findActiveByUserId` |
| `PATCH /invoices/:id/pay` sin `checkSubscription` | Bloquear pago si expirado | El CLIENT debe poder pagar facturas pendientes para resolver su deuda, incluso con suscripción expirada |

### Deuda técnica controlada

`CreateSubscriptionUseCase` + `GenerateInvoiceUseCase` realizan dos escrituras separadas sin transacción. Si la generación de factura falla después de crear la suscripción, el sistema queda inconsistente. **Resolución pendiente:** envolver ambas operaciones en `prisma.$transaction()` mediante un `TransactionPort` en la capa de aplicación.

---

## Descripción de la UI

### Paleta y tipografía

| Token | Valor |
|-------|-------|
| `primary` | `#1A1A1A` (negro ejecutivo) |
| `secondary` | `#475569` (slate-600) |
| `background` | `#F8FAFC` (gray-50) |
| Fuente principal | Inter (Google Fonts) |
| Fuente fallback | Roboto |
| Border radius | 10px (componentes), 14px (cards), 16px (dialogs) |
| Elevation | 0 (Paper) / 1 (Card) |

### Páginas

| Página | Rol | Componentes clave |
|--------|-----|-------------------|
| **Login** | Público | Card centrada, validación inline, loading spinner |
| **Dashboard** | ADMIN | 8 MetricCards con íconos y colores de acento, Skeleton loading |
| **Plans** | Todos | DataGrid con color por tier, dialogs Create/Edit/Delete |
| **Subscriptions** | ADMIN: tabla global \| CLIENT: card con info de suscripción activa | DataGrid, Dialog de creación |
| **Invoices** | ADMIN: tabla global \| CLIENT: tabla propia + botón "Pay Now" | DataGrid, StatusChip, summary stats |

### Componentes reutilizables

- `StatusChip` — chip coloreado para ACTIVE/EXPIRED/PENDING/PAID/OVERDUE
- `PageHeader` — título + subtítulo + slot de acciones
- `TableSkeleton` — placeholder animado para DataGrids
- `AppShell` — Sidebar permanente (#1A1A1A) + TopBar fija
- `SnackbarContext` — feedback global con Alert `variant="filled"`

---

## Ejecución de tests

```bash
cd backend

# Ejecutar todos los tests
npm test

# Con cobertura
npm run test:coverage

# Watch mode
npm run test:watch
```

### Tests implementados (43 en total)

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `billing.test.ts` | 10 | BronzeBillingStrategy, SilverBillingStrategy, GoldBillingStrategy, BillingStrategyFactory |
| `subscription.test.ts` | 9 | Subscription entity, ExpireSubscriptionUseCase, CreateSubscriptionUseCase |
| `invoice.test.ts` | 10 | Invoice entity, MarkInvoiceOverdueUseCase, PayInvoiceUseCase |
| `auth.test.ts` | 7 | JwtTokenService (generate + verify + expired + tampered), BcryptPasswordService |

### Cobertura estimada por capa

| Capa | Cobertura estimada |
|------|-------------------|
| `domain/entities` | ~90% (métodos de negocio cubiertos) |
| `domain/strategies` | 100% |
| `domain/factories` | 100% |
| `domain/errors` | 70% (usados en use case tests) |
| `application/use-cases` (subset) | ~65% (CreateSubscription, Expire, MarkOverdue, Pay) |
| `infrastructure/auth` | 100% (JWT + bcrypt) |

---

## AI Assisted Development

> Consultar la sección completa en el documento siguiente.

Esta plataforma fue diseñada y construida mediante un proceso iterativo de desarrollo asistido por inteligencia artificial, donde la IA actuó como **Staff Software Engineer senior** bajo instrucciones estrictas definidas en `MASTER_PROMPT_CURSOR.md` y `ARCHITECTURE_DECISION_RECORD.md`.

### Cómo se utilizó IA

El proceso siguió un flujo de aprobación explícita fase por fase:

1. **Pre-desarrollo:** El ADR y el prompt maestro se definieron primero. La IA realizó una auditoría técnica completa antes de generar código, identificando brechas en los documentos y proponiendo una checklist de cobertura.

2. **Ciclos iterativos por fases:** Cada fase fue ejecutada con explicación previa de qué principios SOLID intervienen, verificación de dependencias y coherencia con el ADR, y espera de aprobación.

3. **Validaciones activas:** La IA detectó proactivamente dos problemas críticos antes de implementar:
   - El constraint `@@unique([userId, status])` impediría historial de suscripciones EXPIRED.
   - Las estrategias de billing devolvían el mismo valor (sin diferenciación por tier).

### Arquitectura diseñada con IA

La estructura hexagonal completa (capas, interfaces de puertos, composition root, separación domain/application/infrastructure/interfaces) fue diseñada en colaboración con la IA partiendo del ADR. Decisiones clave:

- **Ports en application, no en domain:** `ITokenService` e `IPasswordService` viven en `application/ports/` porque son conceptos de infraestructura que los casos de uso necesitan, no conceptos de negocio puro.
- **Factory en domain:** `BillingStrategyFactory` es lógica de negocio (selección de estrategia por tier), por lo que pertenece al dominio puro.
- **Composition root único:** `container.ts` es el único archivo con `new` de concretos; todos los demás dependen de interfaces.

### Prompts relevantes utilizados

```
"Analiza si @@unique([userId, status]) impide que un usuario tenga múltiples
suscripciones EXPIRED históricas."
→ Identificó el bug antes de implementar, propuso mover la validación al use case.

"Ajusta BillingStrategy para alinearla: BRONZE=price, SILVER=price*1.05, GOLD=price*1.10.
Mantén Open/Closed Principle y BillingStrategyFactory."
→ Solo modificó las dos estrategias afectadas; Factory y interface sin cambios.

"checkSubscriptionStatus debe utilizar casos de uso y repositorios, no lógica embebida."
→ El middleware resultante delega toda la lógica a ISubscriptionRepository.findActiveByUserId
   y ExpireSubscriptionUseCase.execute, con cero lógica de negocio en el middleware.
```

### Aplicación de SOLID mediante IA

| Principio | Cómo la IA lo aplicó |
|-----------|---------------------|
| **SRP** | Cada use case tiene un único método `execute()`; mappers separados de controllers; repositorios separados por agregado |
| **OCP** | Nuevas estrategias = nuevo archivo; nuevos endpoints = nueva ruta/controller sin modificar existentes; nuevos errores = nueva clase en el módulo correspondiente |
| **LSP** | Las 3 estrategias son intercambiables a través de `BillingStrategy`; los 4 repos a través de sus interfaces |
| **ISP** | `DeletePlanUseCase` solo recibe `IPlanRepository` + `ISubscriptionRepository.existsActiveByPlanId`; `checkSubscriptionStatus` solo recibe `ISubscriptionRepository` + `ExpireSubscriptionUseCase` |
| **DIP** | Controllers dependen de use cases concretos (pero podrían abstraerse); use cases dependen solo de interfaces de dominio y ports de application; infrastructure implementa los puertos |

### Refactorizaciones realizadas con apoyo de IA

1. **`@@unique` → `@@index`:** Detectado en auditoría pre-código. Cambio en schema.prisma + refuerzo de la regla en use case.
2. **BillingStrategies diferenciadas:** BRONZE=base, SILVER=+5%, GOLD=+10%. Solo 2 archivos modificados.
3. **N+1 prevention en `GetAllSubscriptionsUseCase`:** Cambiado de queries secuenciales a `Promise.all` + `Map` para lookup O(1) de planes.
4. **`PayInvoiceUseCase` sin `checkSubscription`:** La IA argumentó que bloquear el pago cuando la suscripción expiró es contraproducente (el cliente necesita pagar para "reactivar").
5. **`CreateSubscriptionUseCase` importa `GenerateInvoiceUseCase` como dependencia:** Mantiene DRY en la lógica de generación de factura en un único lugar.

### Edge cases identificados por IA

| Edge case | Resolución implementada |
|-----------|------------------------|
| Usuario con múltiples EXPIRED históricas | `@@unique` eliminado; validación en use case |
| Suscripción con status=ACTIVE pero endDate en el pasado | `isExpired()` verifica ambas condiciones; middleware llama `ExpireSubscriptionUseCase` |
| CLIENT con suscripción expirada intentando pagar | `PATCH /invoices/:id/pay` sin `checkSubscription` |
| CLIENT con suscripción expirada consultando sus facturas | Documentado como observación futura (invoices/me podría no requerir checkSubscription) |
| Dos escrituras (suscripción + factura) sin transacción | Documentado como deuda técnica controlada en use case y container |
| `BillingStrategyFactory` con `noUncheckedIndexedAccess: true` | Guard explícito `if (!strategy)` antes de retornar |
| Token JWT expirado vs token inválido | Dos clases de error distintas: `TokenExpiredError` (401) vs `InvalidTokenError` (401) |
| Plan en uso siendo eliminado | `existsActiveByPlanId` en repositorio; `PlanInUseError` (422) |

### Decisiones técnicas apoyadas por IA

- **Sin DI framework:** La IA evaluó InversifyJS y tsyringe, y decidió que el container manual de ~80 líneas es más auditable, menos "magic" y no añade dependencias.
- **`exactOptionalPropertyTypes: true`:** La IA aplicó el patrón `if (x !== undefined) data.x = x` consistentemente en todos los repository updates para satisfacer el flag.
- **`vitest.config.ts` con umbrales de cobertura:** Configurados como guardianes del proyecto (70% lines/functions, 60% branches).
- **Sidebar oscura (#1A1A1A):** Refuerza el visual "ejecutivo premium" del ADR sin recurrir a estilos inline prohibidos.
- **`SnackbarContext` unificado:** Una sola instancia del componente `Snackbar` a nivel de App en lugar de prop-drilling a cada página.
