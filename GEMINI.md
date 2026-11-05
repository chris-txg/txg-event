# Enterprise & Production Guidelines

This workspace is a mission-critical, enterprise-grade production project running **Django + DRF, PostgreSQL, Redis, Celery** with comprehensive **Audit, Monitoring, and Structured Logging**.

All code, migrations, background tasks, and architectural decisions must strictly adhere to these standards.

---

## 1. PostgreSQL & Database Optimization

### Query & ORM Patterns
* **Prevent N+1 Queries**:
  * Always use `select_related(...)` for ForeignKeys and OneToOne relations.
  * Always use `prefetch_related(...)` with explicit `Prefetch` objects for ManyToMany and reverse ForeignKeys.
* **Lean Querying**:
  * Use `.only(...)` or `.defer(...)` to omit heavy text, JSON, or unused columns.
  * Use `.values(...)` or `.values_list(..., flat=True)` when model instances are not strictly required.
  * Never use `len(queryset)` to check existence or count. Always use `.exists()` or `.count()`.
* **Batch Operations**:
  * Use `bulk_create(..., batch_size=500)` and `bulk_update(..., fields=[...], batch_size=500)` instead of saving in loops.
  * Use `.iterator(chunk_size=2000)` when streaming large querysets to prevent memory exhaustion.
* **Concurrency & Locking**:
  * Wrap state-mutating multi-record operations in `transaction.atomic()`.
  * Use `select_for_update()` to prevent race conditions during concurrent booking, financial, or state mutations.
  * Always keep transactions as short as possible; never execute network I/O, email sending, or heavy external API calls inside `transaction.atomic()`.

### Primary Keys & Identifiers (UUIDv4)
* **Mandatory UUID Primary Keys**:
  * All database models must use UUIDv4 as their primary key:
    ```python
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ```
  * Never use sequential or auto-incrementing integers (`AutoField` / `BigAutoField`) for primary keys or publicly exposed entity identifiers to eliminate object enumeration attacks, collision risks across distributed shards, and information leakage.
  * Ensure all foreign keys referencing models use UUID types and retain explicit `db_index=True`.

### Indexing & Zero-Downtime Migrations
* **Index Strategy**:
  * Add `db_index=True` or explicit `models.Index` on foreign keys, status columns, UUIDs, and search fields.
  * Create composite indexes for columns that are routinely queried or filtered together (e.g., `['user', 'status', 'created_at']`).
  * Use GIN indexes for PostgreSQL `JSONBField` and full-text search fields.
* **Safe Migrations**:
  * Avoid adding columns with default values on large tables unless non-null constraints are added safely.
  * Add indexes concurrently in production migrations when operating on high-volume tables.
  * Never rename or drop columns without a multi-phase migration (Add -> Populate -> Swap -> Drop).

---

## 2. Celery & Asynchronous Task Processing

* **Strict Task Idempotency**:
  * Every Celery task must be idempotent. If executed multiple times with the identical payload, it must produce the exact same outcome without duplicate side-effects.
* **Trigger Only on DB Commit (`transaction.on_commit`)**:
  * Never dispatch a Celery task directly inside an open transaction.
  * Always use `transaction.on_commit(lambda: my_task.delay(...))` to ensure the database record is fully committed before the worker attempts to read it.
* **Lightweight Payloads**:
  * Pass only primitive data types (UUIDs, IDs, strings) to tasks. Never pass Django model instances or large dictionaries.
  * The worker must query the database for fresh state using the ID.
* **Resilience, Timeouts & Retries**:
  * Always define `bind=True`, explicit `max_retries`, and exponential backoff jitter:
    ```python
    @shared_task(bind=True, max_retries=3, default_retry_delay=60, rate_limit='100/m')
    def process_order(self, order_id: str):
        try:
            ...
        except TransientServiceError as exc:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
    ```
  * Always configure `time_limit` (hard limit) and `soft_time_limit` (allows graceful cleanup) on all tasks.
* **Queue Segregation**:
  * Route tasks to dedicated queues (`high_priority`, `default`, `bulk_reports`, `io_heavy`) so heavy batch jobs never starve time-sensitive user requests.

---

## 3. Redis & Caching Strategy

* **Mandatory Expiration (TTL)**:
  * Every cached key must have an explicit TTL. Never write indefinite (`None`) cache entries.
* **Key Namespacing & Versioning**:
  * Standardize key naming: `{service}:{environment}:{resource}:{version}:{identifier}` (e.g., `event:prod:ticket_types:v1:42`).
* **Cache Stampede / Dogpile Mitigation**:
  * For computationally expensive operations, use probabilistic early expiration or Redis distributed locks (`redis.lock(...)`) with appropriate acquisition timeouts.
* **Atomic Redis Operations**:
  * Use Redis pipelines or Lua scripts for multi-step mutations to guarantee atomicity.

---

## 4. Audit Trail & Compliance

* **Immutable Event Sourcing / Append-Only Logs**:
  * Audit logs must be strictly append-only. Never allow update or delete operations on audit records.
  * Record: `actor_id`, `action` (CREATE, UPDATE, DELETE, ACCESS), `target_model`, `target_id`, `timestamp`, `ip_address`, `user_agent`, `changes` (diff of old vs. new values).
* **Context Propagation**:
  * Capture user context (actor, impersonation state, client IP) via middleware into Python `contextvars` or request context so audit signals have complete attribution even in deep service layers.
* **PII & Sensitive Data Redaction**:
  * Never store raw passwords, tokens, API keys, cardholder data, or sensitive PII in audit diffs or system logs.
  * Always scrub sensitive fields before saving changelogs.

---

## 5. Monitoring, Observability & Structured Logging

* **Correlation / Request ID**:
  * Every incoming HTTP request must be tagged with a unique `X-Request-ID` via middleware.
  * The correlation ID must be injected into all log records, Celery task headers, and external API calls for distributed tracing.
* **Structured JSON Logging**:
  * Use structured JSON logging (`structlog` or `python-json-logger`) in production.
  * Include standard context in every log entry: `timestamp`, `level`, `correlation_id`, `user_id`, `module`, `funcName`, `message`, and `extra` structured attributes.
  * Never use `print()` statements. Use `logger.info()`, `logger.warning()`, `logger.error()`.
* **Health Checks & Probes**:
  * Maintain clean `/health/live/` (liveness) and `/health/ready/` (readiness checking PostgreSQL, Redis, and Celery connection health).
* **Defensive Error Handling**:
  * Never catch bare `except:`. Catch specific domain or library exceptions.
  * When logging exceptions, always include traceback (`logger.exception(...)` or `exc_info=True`).

---

## 6. Django REST Framework & API Contracts

* **Input Validation & Permissions**:
  * Never trust incoming client data. Enforce validation inside DRF Serializers.
  * Use strict permission classes (`IsAuthenticated`, custom RBAC object permissions). Never expose unrestricted endpoints by default.
* **Strict Pagination & Throttling**:
  * Every list endpoint must be paginated with maximum page size limits (`page_size_query_param` bounded by `max_page_size`).
  * Configure DRF rate throttling (anon, user, and burst limits).
* **Standard Response & OpenAPI Schema**:
  * Maintain consistent API envelope formatting for errors (`drf-spectacular` compliant with explicit status codes: 400, 401, 403, 404, 409, 429, 500).

---

## 7. Workspace & Environment Rules

* **Virtual Environment**:
  * Always run Python commands and manage dependencies inside the project virtual environment (`backend/venv`).
* **Template Syntax Standards**:
  * Put one control tag per line (`{% with %}`, `{% if %}`, `{% for %}`, `{% block %}`, etc.).
  * Never chain tags on the same line.
  * If a tag (`{{ ... }}`, `{% ... %}`) is opened in a line, close it in the same line itself. Do not split tags across lines.
  * Maintain clean, consistent indentation for nested blocks.
  * Close tags in reverse nesting order.
