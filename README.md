# People Management

A company people-management system that stores organisational hierarchy as a **property graph** in PostgreSQL using [Apache AGE](https://age.apache.org/). The backend follows **Domain-Driven Design** with **CQRS** and an event-driven bus. A Next.js frontend provides full CRUD plus an interactive force-directed graph view.

```
Tenant ──HAS_AREA──► Area ──HAS_SUBAREA──► Subarea ──HAS_MEMBER──► Person
```

---

## Contents

- [Features](#features)
- [Stack](#stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Development setup](#development-setup)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Apache AGE notes](#apache-age-notes)

---

## Features

- **Organisation hierarchy** — multi-level tree: tenant → area → subarea → person
- **Graph storage** — every node and edge lives in an Apache AGE graph; Cypher queries traverse the hierarchy
- **DDD / CQRS** — commands and queries are dispatched through typed buses; domain events propagate through an async in-process event bus
- **Soft deletes** — all entities carry `deleted_at`; no data is ever physically removed
- **REST API** — FastAPI with automatic OpenAPI docs at `/docs`
- **Graph visualisation** — force-directed canvas graph with hover highlights and live filters (by tenant, area, and person search)
- **Full CRUD frontend** — Next.js app for managing tenants, areas, subareas, and people; org-chart tree view per tenant
- **Containerised** — single `docker compose up --build` starts everything

---

## Stack

| Layer | Technology |
|---|---|
| Graph database | PostgreSQL 18 + Apache AGE (Cypher on top of SQL) |
| Backend | Python 3.12 · FastAPI 0.115 · asyncpg 0.29 |
| Architecture | DDD · CQRS · Event-Driven |
| Frontend | Next.js 16 · React 19 · shadcn/ui (base-ui) · react-force-graph-2d |
| Infrastructure | Docker · Docker Compose |

---

## Architecture

### Graph model

```
(t:Tenant)  ──[:HAS_AREA]──►    (a:Area)
                                   │
                             [:HAS_SUBAREA]
                                   │
                                   ▼
                             (s:Subarea)  ──[:HAS_MEMBER]──►  (p:Person)
```

Persons can also be assigned directly to an area via `[:HAS_MEMBER]` without going through a subarea.

Every graph node stores the full entity as properties:

```
Tenant   { id, name, document, email, addresses[], location, created_at, updated_at, deleted_at }
Area     { id, name, tenant_id, created_at, updated_at, deleted_at }
Subarea  { id, name, area_id,   created_at, updated_at, deleted_at }
Person   { id, name, document, email, addresses[], location, created_at, updated_at, deleted_at }
```

### Backend layers

```
interfaces/api      ← FastAPI routes + Pydantic schemas
application         ← commands, queries, handlers, buses
domain              ← entities, value objects, repository interfaces, domain events
infrastructure      ← AGE Cypher repositories, asyncpg pool, event bus
```

**Command flow**

```
Route → CommandBus.dispatch(cmd) → CommandHandler → Repository → AGE graph
                                                  ↓
                                           EventBus.publish(event)
```

**Query flow**

```
Route → QueryBus.dispatch(query) → QueryHandler → Repository → AGE graph
```

### Bounded contexts

| Context | Entities | Responsibility |
|---|---|---|
| `organization` | Tenant, Area, Subarea | Hierarchy management and org-chart |
| `people` | Person | Person CRUD, assignment, org-path traversal |

---

## Quick start

**Prerequisites:** Docker and Docker Compose.

```bash
git clone https://github.com/<you>/people-management
cd people-management
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 |

> **Note:** port 5432 is commonly taken. The compose file binds PostgreSQL on **5433** by default. Override with `POSTGRES_PORT=5432` in `.env` if your machine is free.

---

## Development setup

### Backend (Python)

```bash
# requires Python 3.12+ via pyenv
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# start only the database
docker compose up db -d

# run with hot reload
uvicorn app.main:app --reload
```

### Frontend (Node)

```bash
cd frontend
npm install
# set the API proxy target
echo "API_URL=http://localhost:8000" > .env.local
npm run dev   # → http://localhost:3000
```

The Next.js app rewrites every `/api/v1/*` request to the FastAPI backend, so no CORS headers are required. The same rewrite works inside Docker using the internal hostname `api`.

---

## Environment variables

Copy `.env` and adjust as needed:

```bash
cp .env .env.local   # not committed
```

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `admin` | PostgreSQL superuser |
| `POSTGRES_PASSWORD` | `password` | PostgreSQL password |
| `POSTGRES_DB` | `people_management` | Database name |
| `POSTGRES_PORT` | `5433` | Host-side port binding |
| `API_PORT` | `8000` | Host-side API port |
| `FRONTEND_PORT` | `3000` | Host-side frontend port |
| `ENVIRONMENT` | `development` | Passed to the API container |

The API container derives its `DATABASE_URL` from the individual `POSTGRES_*` variables so the URL never needs to be stored in plain text.

---

## API reference

Full interactive docs: **http://localhost:8000/docs**

### Tenants

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/tenants` | Create tenant |
| `GET` | `/api/v1/tenants` | List tenants (`skip`, `limit`) |
| `GET` | `/api/v1/tenants/{id}` | Get tenant |
| `PUT` | `/api/v1/tenants/{id}` | Update tenant |
| `DELETE` | `/api/v1/tenants/{id}` | Soft-delete tenant |
| `GET` | `/api/v1/tenants/{id}/org-chart` | Full hierarchy tree |

### Areas

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/tenants/{tenant_id}/areas` | Create area under tenant |
| `GET` | `/api/v1/tenants/{tenant_id}/areas` | List areas |
| `GET` | `/api/v1/areas/{id}` | Get area |
| `PUT` | `/api/v1/areas/{id}` | Update area |
| `DELETE` | `/api/v1/areas/{id}` | Soft-delete area |
| `GET` | `/api/v1/areas/{id}/subareas` | List subareas |
| `GET` | `/api/v1/areas/{id}/people` | List direct members |

### Subareas

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/areas/{area_id}/subareas` | Create subarea |
| `GET` | `/api/v1/subareas/{id}` | Get subarea |
| `PUT` | `/api/v1/subareas/{id}` | Update subarea |
| `DELETE` | `/api/v1/subareas/{id}` | Soft-delete subarea |
| `GET` | `/api/v1/subareas/{id}/people` | List members |

### People

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/people` | Create person |
| `GET` | `/api/v1/people` | List people (`skip`, `limit`, `name`) |
| `GET` | `/api/v1/people/{id}` | Get person |
| `PUT` | `/api/v1/people/{id}` | Update person |
| `DELETE` | `/api/v1/people/{id}` | Soft-delete person |
| `POST` | `/api/v1/people/{id}/assign-subarea` | Assign to subarea |
| `POST` | `/api/v1/people/{id}/assign-area` | Assign directly to area |
| `GET` | `/api/v1/people/{id}/org-path` | Full path: tenant→area→subarea→person |

### Pagination

All list endpoints accept `skip` (default `0`) and `limit` (default `50`, max `200`).

### Example: create and connect entities

```bash
# 1. Create a tenant
TENANT=$(curl -s -X POST http://localhost:8000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","document":"12345678000199","email":"admin@acme.com"}')
TID=$(echo $TENANT | jq -r '.id')

# 2. Create an area
AREA=$(curl -s -X POST http://localhost:8000/api/v1/tenants/$TID/areas \
  -H "Content-Type: application/json" \
  -d '{"name":"Engineering"}')
AID=$(echo $AREA | jq -r '.id')

# 3. Create a subarea
SUB=$(curl -s -X POST http://localhost:8000/api/v1/areas/$AID/subareas \
  -H "Content-Type: application/json" \
  -d '{"name":"Backend"}')
SID=$(echo $SUB | jq -r '.id')

# 4. Create a person and assign them
PID=$(curl -s -X POST http://localhost:8000/api/v1/people \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Silva","document":"11122233344","email":"ana@acme.com"}' | jq -r '.id')

curl -X POST http://localhost:8000/api/v1/people/$PID/assign-subarea \
  -H "Content-Type: application/json" \
  -d "{\"subarea_id\":\"$SID\"}"

# 5. Traverse the graph upward
curl http://localhost:8000/api/v1/people/$PID/org-path
```

---

## Project structure

```
people-management/
├── docker-compose.yml
├── init-scripts/
│   └── 01_init_age.sql          # CREATE EXTENSION age + init graph
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI app, lifespan, exception handlers
│       ├── config.py            # Pydantic settings
│       ├── container.py         # Dependency wiring (repos, buses, event handlers)
│       ├── shared/
│       │   ├── application/bus.py          # CommandBus + QueryBus
│       │   ├── domain/
│       │   │   ├── entity.py               # AggregateRoot base
│       │   │   ├── events.py               # DomainEvent base
│       │   │   └── value_objects.py        # Address, Location
│       │   ├── exceptions.py               # EntityNotFoundError, DuplicateEntityError
│       │   └── infrastructure/
│       │       ├── database.py             # asyncpg pool + agtype codec
│       │       ├── age_repository.py       # _cypher() helper base class
│       │       └── event_bus.py            # Async in-process event bus
│       │
│       └── contexts/
│           ├── organization/
│           │   ├── domain/
│           │   │   ├── entities.py         # Tenant, Area, Subarea
│           │   │   ├── events.py           # TenantCreated, AreaCreated, …
│           │   │   └── repositories.py     # Abstract repository interfaces
│           │   ├── application/
│           │   │   ├── commands.py         # CreateTenant, UpdateArea, …
│           │   │   ├── queries.py          # GetTenant, ListAreas, GetOrgChart, …
│           │   │   └── handlers.py         # Command + query handler classes
│           │   ├── infrastructure/
│           │   │   ├── repositories.py     # Cypher-backed implementations
│           │   │   └── graph_queries.py    # OrgChartQueryService
│           │   └── interfaces/api/
│           │       ├── routes.py           # FastAPI router
│           │       └── schemas.py          # Pydantic request/response models
│           │
│           └── people/          # Mirror structure for Person context
│
└── frontend/
    ├── Dockerfile
    ├── next.config.ts            # output:standalone + /api/v1 rewrite proxy
    └── src/
        ├── app/
        │   ├── layout.tsx        # Root layout with sidebar + Toaster
        │   ├── page.tsx          # Dashboard
        │   ├── tenants/          # Tenant list + detail + org-chart
        │   ├── people/           # People table + assign + org-path
        │   └── graph/            # Force-directed graph with filters
        ├── components/
        │   ├── nav-sidebar.tsx
        │   ├── confirm-dialog.tsx
        │   └── ui/               # shadcn/ui components
        └── lib/
            ├── api.ts            # Typed fetch wrappers for every endpoint
            └── graph-data.ts     # Paginated data loader + node/link builder
```

---

## Apache AGE notes

AGE runs Cypher queries inside PostgreSQL via a C extension. Several non-obvious behaviours required workarounds.

### 1. `search_path` resets between requests

asyncpg resets the session `search_path` every time a connection is returned to the pool. Because the `@>` containment operator used by Cypher property-matching lives in `ag_catalog`, losing `ag_catalog` from the path causes every subsequent `PREPARE` to fail with:

```
UndefinedFunctionError: operator does not exist: ag_catalog.agtype @> ag_catalog.agtype
```

**Fix:** pass `search_path` via `server_settings` in `create_pool()` so asyncpg restores it to the correct value on every release.

```python
await asyncpg.create_pool(
    ...,
    server_settings={"search_path": 'ag_catalog, "$user", public'},
)
```

### 2. JSON `null` in the Cypher parameter map

Passing `{"deleted_at": null}` as the agtype parameter map triggers the same `@>` error at query-plan time. Absent properties in Cypher already evaluate to `null`, so stripping `None` values is safe:

```python
filtered = {k: v for k, v in data.items() if v is not None}
```

### 3. `RETURN n` vs `RETURN properties(n)`

Returning a full AGE vertex (`RETURN n`) triggers `agtype_value_to_text: unsupported argument agtype 6` because the vertex type (internally encoded as an array-like agtype) cannot be cast to text. Always return the properties map:

```cypher
RETURN properties(n)   -- ✓ returns clean JSON
RETURN n               -- ✗ crashes on ::text cast
```

### 4. asyncpg parameter type for `cypher()`

AGE's `cypher()` function strictly requires its third argument (the parameter map) to be a PostgreSQL `agtype` value, not plain `text`. asyncpg infers `text` from Python `str`. The fix is to register a custom type codec and wrap params in a sentinel class:

```python
await conn.set_type_codec(
    "agtype", schema="ag_catalog",
    encoder=lambda v: v.value,   # _AgeValue.value is already a JSON string
    decoder=lambda v: v,
    format="text",
)
```
