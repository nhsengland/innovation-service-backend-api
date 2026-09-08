# Redis/Elasticsearch Queue Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid empty `SADD` commands and ensure Redis outages are observable rather than mistaken for an empty Elasticsearch queue.

**Architecture:** Keep the existing Redis set and cron contract. Harden the shared `RedisService` boundary: empty enqueue batches are no-ops, successful empty pops return `null`, and command/connection failures reject after being logged. Configure bounded socket reconnect behavior without enabling the in-memory offline command queue.

**Tech Stack:** TypeScript, node-redis 4.7, Jest, Azure Functions.

---

### Task 1: Add failing Redis service tests

**Files:**
- Create: `libs/shared/services/storage/redis.service.spec.ts`

- [ ] **Step 1: Add a mocked Redis client and logger fixture**

Use `jest.mock('redis')`; return a client fixture with `on`, `connect`, `sAdd`, `sPop`, and `quit` methods. Instantiate `RedisService` through a helper so each test receives a fresh client and logger.

- [ ] **Step 2: Add tests for the required queue contract**

Cover these exact behaviors:

```ts
it('does not call SADD for an empty member list', async () => {
  await service.addToSet('elasticsearch', []);
  expect(redis.sAdd).not.toHaveBeenCalled();
});

it('rethrows an enqueue failure after logging it', async () => {
  const error = new Error('Redis unavailable');
  redis.sAdd.mockRejectedValue(error);

  await expect(service.addToSet('elasticsearch', 'innovation-id')).rejects.toBe(error);
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('elasticsearch'), error);
});

it('returns null only when SPOP succeeds with no members', async () => {
  redis.sPop.mockResolvedValue([]);
  await expect(service.popFromSet('elasticsearch')).resolves.toBeNull();
});

it('rethrows a pop failure after logging it', async () => {
  const error = new Error('Connection timeout');
  redis.sPop.mockRejectedValue(error);

  await expect(service.popFromSet('elasticsearch')).rejects.toBe(error);
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('elasticsearch'), error);
});
```

Also retain a test that a one-member `SPOP` result returns that member.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npx jest libs/shared/services/storage/redis.service.spec.ts --runInBand
```

Expected: the empty-list test currently fails because `sAdd` is called, and the failure-propagation tests fail because the service swallows errors.

### Task 2: Implement the surgical Redis service fix

**Files:**
- Modify: `libs/shared/services/storage/redis.service.ts:18-46`

- [ ] **Step 1: Make empty enqueue a no-op**

After normalizing `members`, add:

```ts
if (values.length === 0) return;
```

before calling `this.redis.sAdd`.

- [ ] **Step 2: Preserve Redis failures**

Keep the existing contextual logs, but add `throw err` after each caught Redis command error. `popFromSet` must return `null` only for a successful empty result.

- [ ] **Step 3: Harden client startup/error logging**

Log client errors with a string message and the `Error` as the second argument, and catch the asynchronous initial `connect()` rejection:

```ts
this.redis.on('error', err => this.logger.error('Redis client error', err));
void this.redis.connect().catch(err => this.logger.error('Redis connection failed', err));
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same Jest command. Expected: all Redis service tests pass.

### Task 3: Configure bounded Redis socket recovery

**Files:**
- Modify: `libs/shared/config/redis.config.ts:18-23`
- Test: `libs/shared/services/storage/redis.service.spec.ts`

- [ ] **Step 1: Add explicit socket settings while retaining offline-queue protection**

Extend `REDIS_DEFAULT_CONNECTION` with:

```ts
socket: {
  connectTimeout: 10000,
  reconnectStrategy: retries => Math.min(100 * 2 ** retries, 5000)
},
```

Keep `pingInterval: 30000` and `disableOfflineQueue: true`.

- [ ] **Step 2: Test the client receives the settings**

Assert the mocked `createClient` call contains `disableOfflineQueue: true`, `socket.connectTimeout: 10000`, and a reconnect strategy function. Test an initial rejected `connect()` is logged as `Redis connection failed`.

- [ ] **Step 3: Run focused tests and lint**

Run:

```bash
npx jest libs/shared/services/storage/redis.service.spec.ts --runInBand
npx eslint libs/shared/services/storage/redis.service.ts libs/shared/config/redis.config.ts libs/shared/services/storage/redis.service.spec.ts
```

Expected: tests pass and ESLint exits successfully.

### Task 4: Regression verification and commit

**Files:**
- Verify: `libs/shared/services/storage/redis.service.ts`
- Verify: `libs/shared/config/redis.config.ts`
- Verify: `libs/shared/services/storage/redis.service.spec.ts`

- [ ] **Step 1: Run the complete library test suite**

Run:

```bash
npm run libs:test -- --runInBand
```

Expected: the suite exits successfully with no Redis service regressions.

- [ ] **Step 2: Review the diff and working tree**

Run:

```bash
git diff --check
git diff --stat
git status --short
```

Confirm only the planned Redis files are modified; do not include generated coverage or unrelated formatter changes.

- [ ] **Step 3: Commit the implementation**

```bash
git add libs/shared/services/storage/redis.service.ts libs/shared/config/redis.config.ts libs/shared/services/storage/redis.service.spec.ts
git commit -m "fix: harden Redis Elasticsearch queue handling"
```
