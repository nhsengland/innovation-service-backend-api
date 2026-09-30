# B2C User Resolution Timeout and Retry Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Route small identity lookups through the legacy filtered OData request, retain JSON batch for 15+ IDs, bound interactive retries, and make only terminal B2C failures error-level.

**Architecture:** Keep IdentityProviderService as the cache and mapping boundary. Add an optional resolution mode with interactive as the default, preserving existing callers. Notifications explicitly select bulk mode. Filtered and batch Graph requests share response mapping, status classification, retry-delay, and cache behavior.

**Tech Stack:** TypeScript, Axios, Microsoft Graph, Azure Functions, Redis, Jest, Application Insights.

---

### Task 1: Add threshold and policy tests first

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.spec.ts
- Modify: libs/shared/services/integrations/identity-provider.service.ts

- [ ] **Step 1: Add boundary tests**

Add tests using the existing IdentityProviderService suite, mocked cache methods, mocked verifyAccessToken, and Axios mocks.

~~~typescript
it('uses filtered lookup for fourteen uncached IDs', async () => {
  const ids = Array.from({ length: 14 }, (_, index) => 'identity-' + index);
  jest.spyOn(sut['cache'], 'getMany').mockResolvedValue([]);
  jest.spyOn(sut['cache'], 'setMany').mockResolvedValue();
  jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
  jest.spyOn(axios, 'get').mockResolvedValue({ data: { value: ids.map(id => ({ id })) } } as any);
  const post = jest.spyOn(axios, 'post');

  await sut.getUsersList(ids);

  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('$filter=id in'), expect.any(Object));
  expect(post).not.toHaveBeenCalledWith(
    'https://graph.microsoft.com/v1.0/$batch',
    expect.anything(),
    expect.anything()
  );
});

it('uses JSON batch for fifteen uncached IDs', async () => {
  const ids = Array.from({ length: 15 }, (_, index) => 'identity-' + index);
  jest.spyOn(sut['cache'], 'getMany').mockResolvedValue([]);
  jest.spyOn(sut['cache'], 'setMany').mockResolvedValue();
  jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
  jest.spyOn(axios, 'post').mockResolvedValue({
    status: 200,
    data: { responses: ids.map(id => ({ id, status: 200, body: { id } })) }
  } as any);

  await sut.getUsersList(ids);

  expect(axios.post).toHaveBeenCalledWith(
    'https://graph.microsoft.com/v1.0/$batch',
    expect.objectContaining({ requests: expect.any(Array) }),
    expect.any(Object)
  );
});
~~~

Use GUID-shaped IDs if URL-length validation rejects arbitrary test IDs. Assert the actual GET URL and batch body.

- [ ] **Step 2: Add policy tests**

Add tests proving that normal calls use interactive mode and notification recipient resolution can select bulk mode. Assert behavior through mocked retry calls rather than exporting private constants.

- [ ] **Step 3: Run tests before implementation**

~~~bash
npm run libs:test -- --runTestsByPath libs/shared/services/integrations/identity-provider.service.spec.ts
~~~

Expected: the new boundary tests fail because current code always uses JSON batch.

### Task 2: Implement lookup routing without changing public response shapes

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.ts
- Modify: libs/shared/services/integrations/identity-provider.service.spec.ts

- [ ] **Step 1: Add named constants and types**

Add near the current B2C constants:

~~~typescript
const FILTERED_LOOKUP_MAX_IDS = 15;
const FILTERED_LOOKUP_THRESHOLD = FILTERED_LOOKUP_MAX_IDS - 1;
const INTERACTIVE_B2C_MAX_RETRIES = 2;
const INTERACTIVE_B2C_MAX_DURATION_MS = 120_000;

type B2CResolutionMode = 'interactive' | 'bulk';

type B2CResolutionOptions = {
  mode?: B2CResolutionMode;
};
~~~

Add JSDoc explaining that Graph documents 15 default in-expressions and the implementation intentionally uses 14 as the safe filtered threshold. Keep batch size 20, concurrency 3, bulk retries 50, and the existing maximum backoff.

- [ ] **Step 2: Add optional arguments**

Use backward-compatible signatures:

~~~typescript
async getUsersList(
  identityIds: string[],
  forceRefresh?: boolean,
  options: B2CResolutionOptions = {}
): Promise<IdentityUserInfo[]>

async getUsersMap(
  identityIds: string[],
  options: B2CResolutionOptions = {}
): Promise<Map<string, IdentityUserInfo>>
~~~

Default mode to interactive. Pass mode only to the missing-ID fetch. Leave Redis lookup, setMany, quarantine, return types, and TTL unchanged.

- [ ] **Step 3: Split fetching into focused helpers**

Refactor the current large method into these private JSDoc-documented helpers:

~~~typescript
private async getUsersListFromB2C(
  entityIds: string[],
  mode: B2CResolutionMode
): Promise<IdentityUserInfo[]>

private async fetchUsersWithFilteredLookup(
  userIds: string[],
  mode: B2CResolutionMode
): Promise<IdentityUserInfo[]>

private async fetchUsersWithJsonBatch(
  userIds: string[],
  mode: B2CResolutionMode
): Promise<IdentityUserInfo[]>

private buildFilteredUsersUrl(userIds: string[]): string
~~~

Routing must be:

~~~typescript
if (uniqueUserIds.length <= FILTERED_LOOKUP_THRESHOLD) {
  return this.fetchUsersWithFilteredLookup(uniqueUserIds, mode);
}

return this.fetchUsersWithJsonBatch(uniqueUserIds, mode);
~~~

Reuse the pre-aa0148b5 URL shape: /beta/users?$filter=id in (...)&$select=.... Measure the encoded URL length; if it exceeds 2,048 characters, use JSON batch instead.

- [ ] **Step 4: Share response mapping**

Use the existing mapB2CUsersToDomain, retry-status helper, Retry-After parser, and batch response validator. Add one normalizer for filtered GET responses. Do not duplicate field mapping.

- [ ] **Step 5: Run focused tests**

~~~bash
npm run libs:test -- --runTestsByPath libs/shared/services/integrations/identity-provider.service.spec.ts
~~~

Expected: threshold tests pass.

### Task 3: Bound interactive retries and change log levels

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.ts
- Modify: libs/shared/helpers/retry.helper.ts
- Modify: libs/shared/services/integrations/identity-provider.service.spec.ts

- [ ] **Step 1: Add policy helpers**

Add pure helpers and types:

~~~typescript
type B2CRetryPolicy = {
  maxRetries: number;
  maxDurationMs?: number;
};

function getB2CRetryPolicy(mode: B2CResolutionMode): B2CRetryPolicy {
  return mode === 'bulk'
    ? { maxRetries: B2C_MAX_RETRIES }
    : { maxRetries: INTERACTIVE_B2C_MAX_RETRIES, maxDurationMs: INTERACTIVE_B2C_MAX_DURATION_MS };
}
~~~

Add helpers for remaining budget and delay validation. Keep each helper small and add JSDoc.

- [ ] **Step 2: Apply the policy to filtered and batch requests**

The first request runs immediately. Retry only status 408, 429, 5xx, missing responses, or invalid batch bodies. Honor Retry-After only when the delay fits within the remaining interactive budget. The inner batch retry loop and outer batch-request retry loop must share one deadline and must not create independent unbounded retry budgets.

- [ ] **Step 3: Use log only for non-terminal events**

Change retry scheduled, missing response, invalid body, permanent intermediate response, and outer retry messages to loggerService.log(). Include status, retry-after, attempt, and remaining budget.

Keep loggerService.error() only for retry-budget exhaustion, final B2C/API failure, and the existing access-token generation failure. Do not emit one error per identity.

- [ ] **Step 4: Add retry tests**

Cover:

- first request succeeds without sleeping;
- HTTP 429 with Retry-After 60 uses log and sleeps;
- only failed batch IDs are retried;
- interactive budget stops before an over-budget delay;
- exhaustion calls error once;
- retry scheduling never calls error;
- bulk mode keeps its larger retry allowance.

Use fake timers and restore them after each test. Mock Axios; no network calls.

- [ ] **Step 5: Run focused validation**

~~~bash
npm run libs:test -- --runTestsByPath libs/shared/services/integrations/identity-provider.service.spec.ts
npm run libs:lint -- --quiet
npm run prettier:check
~~~

Expected: focused tests pass, lint is clean, and formatting is clean.

### Task 4: Select bulk mode only for notification recipient lists

**Files:**
- Modify: apps/notifications/_services/recipients.service.ts
- Modify: apps/notifications/_services/recipients.service.spec.ts

- [ ] **Step 1: Add delegation test**

For the array overload of usersIdentityInfo, assert that getUsersMap receives the IDs and { mode: 'bulk' }. Keep the string overload unchanged so single-recipient lookups remain interactive.

- [ ] **Step 2: Make the surgical delegation change**

Change only the array branch:

~~~typescript
return this.identityProviderService.getUsersMap(userIdentityIds, { mode: 'bulk' });
~~~

Do not change notification payloads, queue messages, email order, or recipient filtering. Add JSDoc for the optional mode if the public type needs explanation.

- [ ] **Step 3: Run notification tests**

~~~bash
npm run app:test --function_app=notifications --runInBand
~~~

Expected: existing notification tests and the new delegation test pass.

### Task 5: Verify and commit the backend implementation

- [ ] **Step 1: Run complete tests**

~~~bash
npm run libs:test
npm run app:test --function_app=notifications --runInBand
~~~

- [ ] **Step 2: Build affected apps**

~~~bash
npm run app:build --function_app=users
npm run app:build --function_app=innovations
npm run app:build --function_app=admin
npm run app:build --function_app=notifications
~~~

- [ ] **Step 3: Review the diff**

~~~bash
git diff --check develop...HEAD
git diff --stat develop...HEAD
git status --short --branch
~~~

Confirm only planned backend source/tests/docs changed. Commit:

~~~bash
git add libs/shared/services/integrations/identity-provider.service.ts \
  libs/shared/services/integrations/identity-provider.service.spec.ts \
  libs/shared/helpers/retry.helper.ts \
  apps/notifications/_services/recipients.service.ts \
  apps/notifications/_services/recipients.service.spec.ts
git commit -m "fix: bound interactive B2C user resolution"
~~~
