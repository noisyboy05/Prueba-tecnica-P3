# SaaS Flow - Architecture Decision Record

## Objetivo

Construir una plataforma SaaS para gestión de suscripciones y facturación que cumpla los requisitos de la prueba técnica:

* Autenticación JWT
* Roles ADMIN y CLIENT
* Gestión de planes
* Gestión de suscripciones
* Facturación automática
* Dashboard de métricas
* Control de acceso basado en suscripción
* Arquitectura Hexagonal
* SOLID
* DRY
* Clean Code
* Repository Pattern
* Strategy Pattern
* Factory Pattern
* Unit Testing

---

# Stack Tecnológico

## Frontend

* React
* TypeScript
* Vite
* React Router
* Axios
* Material UI

## Backend

* Node.js
* Express
* TypeScript

## Base de Datos

* PostgreSQL

## ORM

* Prisma

## Testing

* Vitest o Jest

## Seguridad

* JWT
* bcrypt

## Logging

* Winston

---

# Reglas de Negocio

## Roles

ADMIN
CLIENT

## Planes

BRONZE
SILVER
GOLD

## Suscripciones

* Un usuario solo puede tener una suscripción activa.
* Una suscripción pertenece a un usuario.
* Una suscripción pertenece a un plan.
* Tiene fecha inicio y fecha fin.
* Tiene estado ACTIVE o EXPIRED.

## Facturas

* Se generan automáticamente al crear una suscripción.
* No puede existir factura sin suscripción.
* Deben tener fecha de vencimiento.
* Deben tener monto calculado.

Estados:

PENDING
PAID
OVERDUE

## Seguridad

ADMIN:

* CRUD planes
* Crear suscripciones
* Dashboard
* Ver todas las facturas

CLIENT:

* Ver su suscripción
* Ver sus facturas
* Pagar facturas

## Control de acceso

ACTIVE:
Puede consumir funcionalidades premium.

EXPIRED:
Debe ser bloqueado tanto en frontend como backend.

---

# Modelo de Datos

users

* id UUID PK
* name
* email UNIQUE
* password
* role
* created_at

plans

* id UUID PK
* name
* price
* description
* created_at

subscriptions

* id UUID PK
* user_id FK
* plan_id FK
* start_date
* end_date
* status
* created_at

invoices

* id UUID PK
* subscription_id FK
* amount
* status
* due_date
* created_at

---

# Arquitectura

Hexagonal Architecture

src

domain
application
infrastructure
interfaces

## Domain

Entities

* User
* Plan
* Subscription
* Invoice

Repository Interfaces

* IUserRepository
* IPlanRepository
* ISubscriptionRepository
* IInvoiceRepository

Strategies

* BillingStrategy
* BronzeBillingStrategy
* SilverBillingStrategy
* GoldBillingStrategy

Factories

* BillingStrategyFactory
