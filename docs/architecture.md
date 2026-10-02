# Architecture

Redrawn from the brief's original pipeline sketch to match the **actual** implementation — real module names, real transport, real guard order.

```mermaid
flowchart TB
    subgraph EXT["External"]
        CLIENT["HTTP client (Postman / frontend / Swagger UI)"]
        SIM["Simulator process (simulator/, Node.js + TypeScript)"]
        GROQ["Groq API (OpenAI-compatible chat/completions)"]
    end

    MOSQ["Eclipse Mosquitto (MQTT broker, QoS 1)"]

    subgraph APP["NestJS hybrid app (backend/)"]
        direction TB
        GUARDS["Global guards (APP_GUARD, in order): ThrottlerGuard then JwtAuthGuard. Per-controller: RolesGuard + @Roles(...)"]
        CTRL["HTTP controllers: auth, plants, locations, asset-types, assets, maintenance-plans, work-orders, spare-parts, notifications, audit, health"]
        SWAGGER["/api/docs (Swagger UI)"]
        TELCTRL["TelemetryController - @EventPattern('factory/+/asset/+/telemetry')"]
        SERVICES["Services: TypeORM repos, dataSource.transaction(...), pessimistic row locks"]
        PROCESSOR["ConditionMonitoringProcessor (BullMQ worker)"]
        CRON["ScheduledChecksService (@Cron, hourly: overdue maintenance, low stock)"]
        AI["AiInsightsService + GroqDiagnosticProvider (hard timeout, null fallback, never throws)"]
    end

    PG["PostgreSQL 16 (synchronize: false — migrations are the only source of truth)"]
    REDIS["Redis 7 (telemetry:latest:* cache + BullMQ job store, same instance)"]

    CLIENT --> GUARDS --> CTRL --> SERVICES --> PG
    CTRL -.-> SWAGGER

    SIM -->|"publish, one msg/sec per asset"| MOSQ -->|"subscribe"| TELCTRL
    TELCTRL -->|"validate DTO; drop + log if malformed, never crash"| TELCTRL
    TELCTRL -->|"write latest reading + enqueue job"| REDIS
    TELCTRL -->|"direct insert (just an insert, not 'thinking')"| PG

    REDIS -->|"telemetry-processing job"| PROCESSOR
    PROCESSOR -->|"fetch diagnostic note BEFORE opening transaction"| AI
    AI -->|"HTTPS call, Promise.race timeout"| GROQ
    PROCESSOR -->|"one transaction: asset.status, audit_logs, asset_state_history, work_orders(AUTO), notifications"| PG

    CRON --> PG
    CRON -->|"same service, different context"| AI
```

## Request paths through this diagram

**HTTP path (most endpoints):** `CLIENT → GUARDS → CTRL → SERVICES → PG`. Every mutating write inside `SERVICES` happens inside a `dataSource.transaction(...)` and calls `AuditService.record(...)` with the _same_ transaction manager, so a business write and its audit entry commit or roll back together — never one without the other.

**Telemetry path:** the simulator is a separate OS process; it never talks to Postgres or the backend directly — only to Mosquitto. `TelemetryController` does the minimum to accept a reading quickly: validate, cache, enqueue, and a direct insert. No analysis happens on this hot path.

**Background worker / condition-monitoring path:** `ConditionMonitoringProcessor` consumes the queued job off the hot path, evaluates the deterministic rule, and — only if it trips — calls Groq _before_ opening the database transaction. If Groq times out, errors, or is disabled, `AI` returns `null` and the transaction proceeds exactly as it would have without it. The duplicate-prevention check inside this path is backed by the partial unique index on `work_orders`, so even a worker race can't create two open AUTO work orders for the same asset.

**Scheduled path:** `ScheduledChecksService` runs on `@nestjs/schedule`'s cron, independent of the MQTT/queue path, reusing the same `AI` service for its own notifications.
