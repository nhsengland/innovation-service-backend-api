# Redis/Elasticsearch Queue Reliability Design

## Context

Azure telemetry recorded invalid `SADD` calls, Redis pop failures, connection timeouts, and connection resets. The affected code is the shared Redis service used by Elasticsearch reindexing.

## Scope

BE-only, surgical reliability changes:

- Treat an empty member list as a successful no-op before calling `SADD`.
- Preserve the distinction between an empty set and a Redis failure: `SPOP` returns `null` only for a successful empty result; Redis errors are logged and rethrown. Enqueue failures are also rethrown so callers cannot mistake a failed enqueue for success.
- Configure bounded Redis connection timeout/reconnect backoff and catch initial connection failure. Keep `disableOfflineQueue: true` so commands do not accumulate in process memory while disconnected.
- Add focused unit tests for empty enqueue, propagated enqueue/pop failures, empty pop, and connection configuration/startup handling where practical.

## Non-goals

No queue migration to Redis Streams, DB outbox, or changes to Elasticsearch indexing semantics. Those remain a follow-up for durable delivery across process crashes.

## Expected flow

`addToSet([])` exits without issuing a Redis command. A valid enqueue either succeeds or rejects. `popFromSet()` returns an item, returns `null` for an empty set, or rejects on transport/Redis errors; the cron can then fail visibly and be retried rather than treating an outage as an empty queue.

## Risks and safeguards

Rethrowing enqueue errors may surface Redis outages to request handlers that currently continue; tests will cover the new contract and callers will be reviewed for transaction impact. Reconnect settings remain bounded and offline queuing stays disabled.
