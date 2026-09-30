# B2C User Resolution Timeout and Retry Design

**Status:** Proposed for review  
**Date:** 2026-09-29  
**Branches:** `fix/b2c-user-resolution-timeouts` in the backend and transactional frontend repositories

## Goal

Prevent normal user-facing API requests from waiting for long B2C/Graph retry cycles, while preserving efficient bulk user resolution for announcements and notification work involving thousands of users.

The change covers both repositories:

- Backend: choose an appropriate B2C lookup strategy, bound retry duration, preserve cache correctness, and reduce misleading error telemetry.
- Frontend: set the existing global Axios timeout policy to three minutes and make the value named and consistent.

## Evidence and current behavior

The current backend branch is `develop` at `032a2861`. The frontend branch is `develop` at `f1827fb5`.

The relevant implementation history is:

- `8d232b1d`: introduced B2C rate-limit retry/backoff handling.
- `39757d0a`: increased concurrent requests to 10, despite the existing comment that more than 3 caused 429 responses.
- `aa0148b5`: changed user-list retrieval from OData filtering to Microsoft Graph JSON `$batch`, using batches of 20 and three concurrent batches, with partial subrequest retries.
- `8a1f5524`: increased B2C retries from 20 to 50.
- `eafeef02`: added confirmation and cache refresh logic after B2C user updates.

Production telemetry showed:

- 29 transactional frontend requests returning HTTP 500 after approximately 60 seconds.
- Matching backend Function requests returning HTTP 200 after approximately 60–362 seconds.
- B2C logs such as `Retrying N batch subrequests in 60000ms`.
- Graph outer `$batch` requests completing with HTTP 200 while individual batch subrequests were retried.
- The transactional frontend has a shared Axios timeout of 60 seconds.
- The frontend also has a separate 60-second Axios instance for authentication routes.
- APIM `socket hang up` entries occur after the frontend request has already timed out.

The current `$batch` path is used even for one or two missing identity IDs. Therefore, small interactive requests such as `/users/v1/me`, admin user lookup, and innovation details can enter the same long retry path intended to support large recipient lists.

## Proposed architecture

### 1. Separate interactive and bulk resolution behavior

The identity provider should expose two internally distinct resolution policies:

Microsoft's official Graph known-issues documentation states that the OData `in` operator is limited to 15 expressions by default. Each user ID in the old `id in ('id1', 'id2', ...)` query is one expression, so the documented maximum is 15 IDs per filtered request. The same documentation notes a 2,048-character URL limit when advanced queries are used. The old query's selected fields and GUID IDs remain below that URL limit at 15 IDs, but the implementation must still measure the encoded URL before sending it.

Source: [Microsoft Graph known issues](https://learn.microsoft.com/en-us/graph/known-issues?view=graph-rest-1.0). The 999/500 values in the [list users documentation](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0) are response page sizes, not the number of IDs allowed in an `in` filter.

Use the documented maximum minus one as the direct-lookup threshold:

```text
Interactive request
  0 IDs        -> return immediately
  1–14 IDs     -> old filtered OData lookup
  15+ IDs      -> JSON $batch with bounded retries

Bulk/background request
  Any size     -> JSON $batch, chunks of 20, controlled concurrency
                and a longer queue-oriented retry budget
```

The values must be named constants: `FILTERED_LOOKUP_MAX_IDS = 15` and `FILTERED_LOOKUP_THRESHOLD = 14`. The old filtered lookup and the `$batch` path must share field mapping, response validation, retry classification, and cache-write helpers. No duplicate Graph parsing or cache logic should be introduced.

### 2. Bound interactive B2C retries

The current 50-attempt policy is unsuitable for an interactive HTTP request. The initial interactive total-resolution budget proposed for review is 120 seconds, leaving 60 seconds for the rest of the three-minute FE request budget. Interactive resolution should have:

- a maximum attempt count;
- a maximum total elapsed time;
- `Retry-After` support when the delay fits inside the remaining budget;
- no sleep that extends beyond the remaining budget;
- one aggregate warning when retries are scheduled;
- one terminal error only when the retry budget is exhausted or the final API operation fails.

Bulk/background processing may retain a larger retry budget, because it is not holding an FE request open. The two policies must be explicit so a notification job cannot accidentally impose its retry budget on `/me`, search, or innovation detail requests.

The implementation must preserve existing response shapes and caller contracts. It must not introduce a new partial-response schema, new status code, or broad caller refactor as part of this fix. Existing fallback behavior remains unchanged unless a specific caller requires a separate review.

### 3. Preserve and improve caching

The existing sequence should remain:

```text
Redis lookup -> fetch only missing IDs -> validate successful users
            -> cache successful users -> merge cached and fetched users
```

Fetched users should be cached only after their response has been validated. The default Redis TTL remains 24 hours unless configured otherwise.

404 identities remain quarantined. Retry exhaustion must not cache incomplete or invalid user records.

### 4. Frontend timeout policy

The frontend global Axios timeout should become a named constant set to 180 seconds (three minutes). Both existing Axios instances must use the same value:

- `src/server/routes/api.routes.ts`
- `src/server/routes/authentication.routes.ts`

Recommended behavior:

- Apply the three-minute value globally and consistently.
- Do not add endpoint-specific timeout exceptions in this surgical change.
- Prefer queue submission plus an immediate response for announcement and large email operations.
- Preserve the current response contract; do not change timeout failures to a new status code as part of this fix.

The three-minute timeout is a compatibility mitigation for the observed 60-second FE failure. It does not remove the need for the backend lookup threshold and retry budget: the observed worst request was approximately 362 seconds.

The implementation plan must verify that APIM/platform timeouts are compatible with 180 seconds.

### 5. Logging and alert noise

Only `.log()` and `.error()` are available. Retry scheduling is expected control flow, so it must not be logged as an error for every attempt.

Logging policy:

| Event | Level | Required fields |
|---|---|---|
| Cache lookup | `.log()` | requested, cached, missing counts |
| Retry scheduled | `.log()` | operation ID, status, retry-after, attempt, remaining budget |
| Missing/invalid batch subresponse | `.log()` | count and affected batch/request |
| 401/403 or other intermediate dependency response | `.log()` | status and correlation data |
| Retry budget exhausted | `.error()` once | unresolved count, statuses, elapsed time |
| Final API failure | `.error()` once | operation ID, endpoint, dependency status |

The retry logs must record the actual inner Graph status. The current messages record the count and delay but omit the status, which is why 429 is strongly suspected but not proven by telemetry.

The current `innovation service app insights errors` alert is based on failed requests (`requests/failed`, HTTP 500), not directly on `LoggerService.error()` traces. Moving intermediate retry messages to `.log()` will reduce telemetry noise but will not by itself stop the current alert emails. The frontend must stop returning 500 for requests that can be completed within the selected policy.

## Components in scope

### Backend repository

- `libs/shared/services/integrations/identity-provider.service.ts`
  - old filtered lookup for 1–14 IDs;
  - batch resolution policy;
  - bounded interactive retries;
  - status and retry telemetry;
  - shared response mapping and cache writes.
- `libs/shared/helpers/retry.helper.ts`
  - shared retry budget/deadline helpers if required.
- Identity provider unit tests and affected domain/notification tests.
- Notification/announcement call sites only where needed to distinguish bulk/background resolution from interactive resolution.

### Transactional frontend repository

- `src/server/routes/api.routes.ts`
  - named timeout configuration;
  - timeout observability.
- `src/server/routes/authentication.routes.ts`
  - use the same named three-minute timeout constant.
- Relevant API proxy tests, if present; otherwise add focused tests around timeout selection and upstream timeout handling.

The design does not include a general rewrite of the notification system or a change to email provider delivery semantics.

## Alternatives considered

### Option A: Increase the global FE timeout to three minutes

Smallest FE mitigation and compatible with the requested policy, but it does not reduce Graph throttling or replace the backend lookup change. It is not sufficient by itself.

### Option B: Always use the old OData/direct lookup

May simplify small requests, but it removes the efficiency needed for thousands of users and does not eliminate Graph throttling. Not suitable for bulk processing.

### Option C: Hybrid lookup with separate interactive/bulk policies

Use the old filtered lookup for 1–14 IDs, JSON `$batch` for 15+ IDs, bounded retries for interactive calls, a global three-minute FE timeout, and longer queue-oriented processing for bulk work. This preserves the original scalability goal while preventing bulk behavior from leaking into normal FE requests. Recommended.

## Acceptance criteria

1. A one-user or fourteen-user lookup uses the old filtered OData request and does not construct a JSON `$batch` request.
2. A fifteen-user lookup uses the JSON `$batch` path.
3. A retryable Graph response cannot hold an interactive request beyond its configured total budget.
4. `Retry-After` is honored only within the remaining retry budget.
5. Successful fetched users are cached with the existing TTL after validation.
6. Retry telemetry includes actual inner status and retry delay, but normal retries do not produce one Error trace per attempt.
7. Retry-budget exhaustion produces one `.error()` event.
8. Final API failure produces one `.error()` event.
9. Normal `/me`, search, innovation detail, users list, and admin lookup requests do not return 500 solely because a B2C retry slept beyond the old 60-second FE timeout.
10. Both frontend Axios instances use the global 180-second timeout.
11. Large announcement/email work remains asynchronous and is not made dependent on a three-minute browser/API request.
12. Backend and frontend tests cover filtered lookup, batch lookup, retry deadlines, cache writes, logging levels, and global timeout configuration.

## Review decisions requested

Before implementation planning, review these decisions:

1. Confirm the documented Graph maximum of 15 filtered `in` expressions and the implementation threshold of 14 IDs.
2. Confirm the initial 120-second interactive B2C retry budget.
3. Confirm the global three-minute timeout should apply to both API and authentication Axios instances.
4. Confirm that response shapes/status codes remain unchanged in this surgical fix.
