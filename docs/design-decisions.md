# Design Decisions

Trade-offs made while building this system, written down so a reviewer doesn't have to reverse-engineer _why_ from the code alone.

## ORM: TypeORM over Prisma

TypeORM's `EntityManager`/`QueryRunner` and `.setLock('pessimistic_write')` map directly onto the row-locking that inventory consumption and work-order completion need, with first-class NestJS support (`@nestjs/typeorm`). Migrations are CLI-driven and `synchronize: false` from the first migration. The schema's source of truth is the migration history in `backend/src/database/migrations/`, never runtime entity reflection.

**In practice:** the completion transaction and the inventory-locking transaction both use `this.dataSource.transaction(async (manager) => { ... })` rather than manually instantiating a `QueryRunner`. `DataSource.transaction()` manages a `QueryRunner` internally and hands you its `EntityManager`: same atomicity and locking guarantee, less boilerplate to get wrong. The pessimistic lock itself is explicit: `manager.createQueryBuilder(SparePart, 'part').setLock('pessimistic_write').where(...)`.

## Pessimistic row locking over optimistic/version-column concurrency

Every write to `spare_parts.quantity_on_hand` (consume, restock, or adjust) locks that row with `SELECT ... FOR UPDATE` before reading or writing the quantity. This serializes all writes to a given part at the database level, regardless of which code path triggered them. That's what actually prevents a double-spend, not an `if (stock > 0)` check in application code, which is itself a race under concurrency.

Optimistic (version-column) concurrency was the alternative. Pessimistic locking was chosen because it's simpler to reason about and simpler to prove correct with a deterministic test for the canonical race (stock = 1, two concurrent consumers). Optimistic concurrency would require a retry loop on version conflict, which adds a second thing to get right and test.

## The audit module was built before the modules that depend on it

The brief's own suggested order places a general audit ledger after maintenance and inventory. This build built it first instead, because work-order completion needs to write an audit entry _inside its own transaction_ as one of several atomic side effects. Building the ledger after the modules that call it would have meant retrofitting every write path once it existed. The ledger is append-only, protected by both a `REVOKE UPDATE, DELETE` grant and a `BEFORE UPDATE OR DELETE` trigger on `audit_logs`, so no later code path, however it's written, can mutate history.

## `maintenance_history` is a derived query, not a stored table

A completed work order already _is_ a maintenance history record. A separate `maintenance_history` table would duplicate the same facts and create a second source of truth that could drift from the first. Instead, `GET /work-orders?assetId=&status=COMPLETED` (filters already present on the work-orders list endpoint) _is_ the maintenance history for an asset. This is a deliberate scope decision, documented here rather than left implicit.

## Duplicate auto-generated work orders are prevented at the database level

The condition-monitoring rule checks for an existing open `AUTO` work order before creating a new one, but a check-then-insert is itself a race under real concurrency: two worker jobs evaluating the same asset at nearly the same instant could both pass the check before either inserts. The actual safety net is a Postgres partial unique index:

```sql
CREATE UNIQUE INDEX "IDX_work_orders_one_open_auto_per_asset"
ON "work_orders" ("asset_id")
WHERE "status" IN ('OPEN','ASSIGNED','IN_PROGRESS','BLOCKED')
  AND "source" = 'AUTO'
```

Two open auto-generated work orders for the same asset are structurally impossible, not just unlikely.

## Telemetry is inserted directly, not queued a second time

A valid telemetry reading does three things on ingest: write the "latest" value to Redis, enqueue a `telemetry-processing` job for the condition-monitoring worker, and persist a row in `telemetry_readings`. That last step is a direct insert inside the MQTT handler rather than a second queue: it's just an insert, not an analysis step, and adding a second queue for it would be complexity without a corresponding benefit at this scale. The composite index `telemetry_readings(asset_id, recorded_at DESC)` keeps the realistic "recent readings for this asset" query fast without it.

**What would change at real production scale:** monthly partitioning of `telemetry_readings`, explicitly out of scope here but called out rather than silently ignored.

## NestJS pinned to the 11.x line

NestJS shipped a new major version as pure ESM (`"type": "module"`) partway through this build. `ts-jest`/Jest (CommonJS) can't load it: `npm test` failed outright with `Must use import to load ES Module`, confirmed directly by running the as-committed test suite against the newer version. Migrating to ESM + Vitest mid-build was rejected as an unplanned stack change with no functional benefit to this project; pinning `@nestjs/*` packages to their last CommonJS-compatible release (the `11.x` line) kept every already-working tooling decision (Jest, `ts-jest`, `oxlint`) valid. The one real casualty of the downgrade was `RedisHealthIndicator`, which used a builder API (`.attempt()/.withTimeout()`) only present on the newer line. It was rewritten against the stable `HealthIndicatorSession` API (`.up()`/`.down()`) with a small hand-rolled `Promise.race` standing in for `.withTimeout()`.

**For the record:** NestJS's own newer scaffolding now defaults _new_ projects to ESM + Vitest for exactly this reason; a rebuild of this project from scratch today might reasonably start there instead of pinning back.

## Repository layout: one repo, three top-level folders

`backend/` (NestJS), `simulator/` (Node.js/TypeScript), `docs/`, rather than separate repositories. Easier for a reviewer to clone once and understand the whole system as one piece, and there's no independent deployment or versioning need that would justify splitting them.

## Simulator: Node.js/TypeScript, not C++

MQTT is what does the architectural work here: decoupled pub/sub, a realistic industrial protocol, an independent process publishing readings. The publisher's implementation language doesn't change any of that. A Node.js/TypeScript simulator matches the rest of the repo's tooling (npm, `tsc`, one Docker base-image family instead of two) and needs no separate build-stage ceremony. The genuine reasons to reach for C++ (real-time constraints, direct hardware access, tight memory limits) don't apply to a simulator publishing synthetic readings from inside a dev container, so this trade cost nothing architecturally while saving real setup time.

## AI diagnostic notes: isolated from everything that's tested for correctness

The AI-generated diagnostic note attached to auto-created work orders and notifications uses Groq's free, OpenAI-compatible `chat/completions` endpoint. Several choices keep this free, rate-limited, third-party dependency from ever being able to affect correctness:

- The call happens **before** the enclosing database transaction opens, using data already fetched for the rule check: an LLM round-trip can take seconds, and holding a Postgres transaction open for that long for a non-critical enrichment would be a bad trade.
- The result is wrapped in a hard timeout (`Promise.race` against a timer) with **one attempt and a silent `null` fallback** on any failure: timeout, non-200, malformed response. No retry queue, no BullMQ job for this; that would be real complexity for a feature explicitly allowed to fail.
- The note is stored in a **new, separate nullable column** (`ai_note`) on both `work_orders` and `notifications`, never appended to the existing `description`/`message` text those tables already write and already have tests asserting on.

* It's **off by default** (`AI_INSIGHTS_ENABLED=false`), so cloning the repo, running the suite, or working on any unrelated part of the system never requires a Groq key.
* The model is configurable via `GROQ_MODEL`. The current configuration uses `openai/gpt-oss-20b`; if `GROQ_MODEL` is unset, the code falls back to `llama-3.1-8b-instant`.

The deterministic rule in condition monitoring always decides whether an alert fires and what status it sets; the AI only ever attaches commentary after that decision is already made.

## What would genuinely be done differently with more time

- **TimescaleDB** for `telemetry_readings` if this needed to scale past a portfolio-sized demo: hypertables and native time-series compression would matter once reading volume is large and sustained; out of scope here per the brief.
- **Branch protection** on `main` requiring the CI checks to pass before merge; straightforward to turn on, just not automated as part of this build.
- Partitioning strategy for `telemetry_readings` and `audit_logs` once either grows past a single-node Postgres instance's comfortable working set.
