# B2C Outer-Batch Skipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Skip an exhausted or non-authentication outer Graph batch, record every identity in that batch as failed, continue later batches, and preserve existing public user-list/map return types.

**Architecture:** Add an internal result type containing users and failedIdentityIds. Inner batch functions return partial results; outer batch transport returns a discriminated success/skipped result. Authentication failures (401/403) still throw and stop the operation. getUsersList() continues returning IdentityUserInfo[], caches only successful users, and logs failure metadata.

**Tech Stack:** TypeScript, Axios, Jest, existing IdentityProviderService retry helpers.

**Constraints:** Keep INTERACTIVE_B2C_MAX_RETRIES = 3 and INTERACTIVE_B2C_MAX_DURATION_MS = 200_000. No commits or pushes.

## File Map

- Modify: libs/shared/services/integrations/identity-provider.service.ts
  - Add internal resolution/batch outcome types.
  - Return partial results from filtered and JSON-batch paths.
  - Skip failed non-authentication outer batches.
  - Preserve authentication failure propagation.
- Test: libs/shared/services/integrations/identity-provider.service.spec.ts
  - Verify later batches continue after one outer batch is skipped.
  - Verify failed IDs are recorded and successful users remain cacheable.
  - Verify 401/403 still reject the operation.
  - Verify retry logging/error logging policy.

### Task 1: Add failing tests for skipped outer batches

**Files:**
- Test: libs/shared/services/integrations/identity-provider.service.spec.ts

- [ ] Add a test that mocks private postB2CUserBatchWithRetry() to return skipped for the first 20-ID chunk and success for the second 20-ID chunk, then calls private fetchUsersWithJsonBatch() and expects:

~~~
expect(result.users).toHaveLength(20);
expect(result.failedIdentityIds).toEqual(firstChunkIds);
~~~

- [ ] Add a test that verifies a terminal 401 or 403 from the outer batch still rejects instead of being converted into a skipped batch.

- [ ] Add a test that verifies retryable subrequest IDs exhausted after retries are added to failedIdentityIds, while successful IDs remain in users.

- [ ] Run:

~~~
npx jest libs/shared/services/integrations/identity-provider.service.spec.ts --runInBand --forceExit --silent
~~~

Expected: the new tests fail because current outer-batch errors reject and current internal methods return only arrays.

### Task 2: Introduce internal result types

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.ts

- [ ] Add:

~~~
type B2CUserResolutionResult = {
  users: IdentityUserInfo[];
  failedIdentityIds: string[];
};

type B2CBatchRequestResult =
  | { kind: 'success'; responses: B2CBatchSubResponse[] }
  | { kind: 'skipped'; failedIdentityIds: string[] };
~~~

- [ ] Keep getUsersList() and getUsersMap() public return types unchanged.

- [ ] Keep the existing retry constants, including the user-modified interactive values:

~~~
const INTERACTIVE_B2C_MAX_RETRIES = 3;
const INTERACTIVE_B2C_MAX_DURATION_MS = 200_000;
~~~

### Task 3: Make the outer batch return a skippable outcome

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.ts

- [ ] Change postB2CUserBatchWithRetry() to return B2CBatchRequestResult.

- [ ] On successful validated response, return:

~~~
{ kind: 'success', responses }
~~~

- [ ] When the retry budget is exhausted or a non-retryable outer request fails:
  - keep the existing terminal .error() log;
  - if status is 401 or 403, rethrow the B2CBatchRequestError;
  - otherwise return:

~~~
{ kind: 'skipped', failedIdentityIds: userIds }
~~~

- [ ] Treat invalid/incomplete outer responses as skippable after their retry budget is exhausted.

### Task 4: Continue processing after a skipped batch

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.ts

- [ ] Change fetchUserBatchWithRetry() to return B2CUserResolutionResult.

- [ ] When postB2CUserBatchWithRetry() returns skipped, return the accumulated successful users plus all pending IDs as failed IDs.

- [ ] When retryable individual subrequests exhaust their retry budget, append those IDs to failedIdentityIds and return instead of throwing.

- [ ] Add permanent skipped identities such as 404/400 responses to failedIdentityIds; retain quarantine behavior for 404.

- [ ] Preserve 401/403 propagation.

- [ ] Change fetchUsersWithJsonBatch() to aggregate results from all chunks:

~~~
const users = results.flatMap(result => result.users);
const failedIdentityIds = results.flatMap(result => result.failedIdentityIds);
~~~

- [ ] Keep Promise.all() because each chunk now converts skippable outer failures into data. Authentication/configuration failures still reject Promise.all() and stop the operation.

### Task 5: Preserve public behavior and cache only successful users

**Files:**
- Modify: libs/shared/services/integrations/identity-provider.service.ts

- [ ] Change internal getUsersListFromB2C() to return B2CUserResolutionResult for the batch path, while wrapping successful filtered-lookup results as `{ users, failedIdentityIds: [] }`.

- [ ] Keep fetchUsersWithFilteredLookup() fail-fast on its final error; this change targets failed outer JSON batches only.

- [ ] In getUsersList(), destructure the internal result:

~~~
const { users: nonCachedUsers, failedIdentityIds } = await this.getUsersListFromB2C(...);
~~~

- [ ] Cache only nonCachedUsers.

- [ ] Append only successful users to the public result array.

- [ ] Add one structured log containing failure count and failed IDs. Keep intermediate retry/permanent-user messages at .log(); keep retry-budget exhaustion/final outer failure at .error().

- [ ] Do not change the public IdentityUserInfo[]/Map<string, IdentityUserInfo> response shape.

### Task 6: Run verification

- [ ] Run focused identity-provider tests:

~~~
npx jest libs/shared/services/integrations/identity-provider.service.spec.ts --runInBand --forceExit --silent
~~~

- [ ] Run notifications regression tests:

~~~
npx jest apps/notifications/_services/recipients.service.spec.ts --runInBand --forceExit --silent
~~~

- [ ] Build notifications:

~~~
npm run app:build --function_app=notifications
~~~

- [ ] Run formatting and diff checks:

~~~
npx prettier --check libs/shared/services/integrations/identity-provider.service.ts libs/shared/services/integrations/identity-provider.service.spec.ts
git diff --check
~~~

- [ ] Confirm both branches remain uncommitted and unpushed.

No commit step: user explicitly prohibited commits unless separately requested.
