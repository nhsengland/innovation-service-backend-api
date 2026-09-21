# Mandatory Names and Identity Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Keep `givenName`, `surname`, and `displayName` consistent across admin creation, queued identity operations, and frontend presentation while retaining the agreed mandatory-name rule for legacy users.

**Architecture:** Keep synchronous profile updates unchanged. Add synchronization at the existing-B2C admin-reuse boundary and the queued identity listener. Make the Innovator dashboard use the existing shared display-name fallback helper. No database migration, custom B2C attributes, queue redesign, or bulk migration is included.

**Tech Stack:** TypeScript, Azure Functions, Microsoft Graph/B2C, TypeORM/Jest, Angular/Jest.

**Repositories:**

- Backend: `innovation-service-backend-api`, branch `feat/mandatory-given-and-surname`
- Frontend: `innovation-service-transactional-frontend`, branch `feat/mandatory-given-and-surname`

**Workflow constraint:** Never run `git commit`. Keep implementation and test changes uncommitted.

---

## File map

Backend:

- Modify `apps/admin/_services/users.service.ts`: update reused B2C identities with the admin's submitted names.
- Modify `apps/admin/_services/users.service.spec.ts`: test successful existing-B2C reuse and failure handling.
- Create `apps/users/v1-identity-operations-listener/identity-name.helper.ts`: merge partial names and derive synchronized `displayName`.
- Create `apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts`: unit-test name merging and invalid merged names.
- Modify `apps/users/v1-identity-operations-listener/index.ts`: invoke normalization only for name-changing queue messages.
- Modify `apps/users/v1-identity-operations-listener/index.spec.ts`: test synchronized queued updates and non-name pass-through.

Frontend:

- Modify `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.ts`: use `StringsHelper.getUserDisplayName`.
- Create `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.spec.ts`: test split-name preference and legacy fallback.
- Extend existing manage-details/first-time-sign-in specs only where required to protect the agreed mandatory-name behavior; do not change that policy.

## Data contract

The queue remains a partial-update contract:

~~~ts
type IdentityUpdateBody = {
  givenName?: string;
  surname?: string;
  displayName?: string;
  mobilePhone?: string | null;
  accountEnabled?: boolean;
};
~~~

Only a message that explicitly contains `givenName` or `surname` enters name synchronization. It fetches the current identity, merges supplied fields with current fields, and sends:

~~~ts
{
  ...body,
  givenName: effectiveGivenName,
  surname: effectiveSurname,
  displayName: effectiveGivenName + ' ' + effectiveSurname
}
~~~

Use property presence, not truthiness, so supplied values are not silently replaced. The existing queue schema rejects blank or overlong supplied names; the helper must also reject a merged result where either required name is missing. Never split the legacy `displayName`.

## Task 1: Add failing admin-reuse tests

**Files:**

- Modify: `apps/admin/_services/users.service.spec.ts`
- Reference: `apps/admin/_services/users.service.ts:186-209`

- [ ] **Step 1: Test existing B2C reuse.**

Spy on `IdentityProviderService.prototype.getUserInfoByEmail` and `.updateUser`. Return a B2C identity with a generated ID, call `sut.createUser` with `givenName: 'Jonathan'`, `surname: 'Smythe'`, and a new email, then assert:

~~~ts
expect(updateUserSpy).toHaveBeenCalledWith(identityId, {
  givenName: 'Jonathan',
  surname: 'Smythe',
  displayName: 'Jonathan Smythe'
});
~~~

Also query `UserEntity` and assert the created application user uses that identity ID, proving the reuse branch was exercised.

- [ ] **Step 2: Test update failure prevents app-user creation.**

Mock `getUserInfoByEmail` to return an existing identity and `updateUser` to reject. Assert `sut.createUser(...)` rejects with the same error and no `UserEntity` is created for that identity.

- [ ] **Step 3: Run the tests before implementation.**

~~~bash
npm run app:configure --function-app=admin
npx jest --runInBand --silent apps/admin/_services/users.service.spec.ts
~~~

Expected result: the new tests fail because the current existing-B2C branch does not call `updateUser`.

## Task 2: Implement synchronized admin reuse

**Files:**

- Modify: `apps/admin/_services/users.service.ts:186-209`
- Test: `apps/admin/_services/users.service.spec.ts`

- [ ] **Step 1: Update the reused B2C identity before app linking.**

After confirming the B2C identity has no application user, add:

~~~ts
await this.identityProviderService.updateUser(identityId, {
  givenName: data.givenName,
  surname: data.surname,
  displayName: data.givenName + ' ' + data.surname
});
~~~

Keep this before `transaction.save(...)`. Do not suppress errors; a failed B2C update must prevent application-user creation.

- [ ] **Step 2: Run the focused admin suite.**

~~~bash
npx jest --runInBand --silent apps/admin/_services/users.service.spec.ts
~~~

Expected result: all admin user-service tests pass.

- [ ] **Step 3: Review only the intended diff.**

~~~bash
git diff -- apps/admin/_services/users.service.ts apps/admin/_services/users.service.spec.ts
~~~

Expected result: only existing-B2C synchronization and its tests are present.

## Task 3: Add failing queued-name helper tests

**Files:**

- Create: `apps/users/v1-identity-operations-listener/identity-name.helper.ts`
- Create: `apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts`

- [ ] **Step 1: Define the helper tests.**

The helper contract is `normalizeNameUpdate(body, currentIdentity)`. Add tests equivalent to:

~~~ts
expect(normalizeNameUpdate(
  { givenName: 'Jonathan' },
  { givenName: 'John', surname: 'Smith' }
)).toMatchObject({
  givenName: 'Jonathan',
  surname: 'Smith',
  displayName: 'Jonathan Smith'
});

expect(normalizeNameUpdate(
  { surname: 'Smythe' },
  { givenName: 'Jonathan', surname: 'Smith' }
)).toMatchObject({
  givenName: 'Jonathan',
  surname: 'Smythe',
  displayName: 'Jonathan Smythe'
});

expect(normalizeNameUpdate(
  { givenName: 'Jonathan', surname: 'Smythe', displayName: 'John Smith' },
  { givenName: 'John', surname: 'Smith' }
)).toMatchObject({ displayName: 'Jonathan Smythe' });
~~~

Also test that a non-name body such as `{ accountEnabled: false }` is unchanged and that a name change against a current identity missing the opposite name throws `BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD)`.

- [ ] **Step 2: Run the helper spec before implementation.**

~~~bash
npx jest --runInBand --silent apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts
~~~

Expected result: FAIL because the helper implementation does not yet exist.

## Task 4: Implement and integrate queued synchronization

**Files:**

- Modify: `apps/users/v1-identity-operations-listener/index.ts`
- Modify: `apps/users/v1-identity-operations-listener/identity-name.helper.ts`
- Test: `apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts`
- Test: `apps/users/v1-identity-operations-listener/index.spec.ts`

- [ ] **Step 1: Implement explicit-presence merging.**

The helper's core must be equivalent to:

~~~ts
const hasGivenName = Object.prototype.hasOwnProperty.call(body, 'givenName');
const hasSurname = Object.prototype.hasOwnProperty.call(body, 'surname');

if (!hasGivenName && !hasSurname) {
  return body;
}

const givenName = hasGivenName ? body.givenName : currentIdentity.givenName;
const surname = hasSurname ? body.surname : currentIdentity.surname;

if (!givenName?.trim() || !surname?.trim()) {
  throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
}

return {
  ...body,
  givenName,
  surname,
  displayName: givenName.trim() + ' ' + surname.trim()
};
~~~

Preserve `mobilePhone` and `accountEnabled`. Ignore a caller-supplied stale `displayName` when either split name changes.

- [ ] **Step 2: Run helper tests.**

~~~bash
npx jest --runInBand --silent apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts
~~~

Expected result: all helper tests pass.

- [ ] **Step 3: Integrate after Joi validation.**

Retain current validation, then use this flow:

~~~ts
const operation = JoiHelper.Validate<IdentityOperationType>(IdentityOperationSchema, requestOperation);
const body = operation.data.body;
const hasNameChange =
  Object.prototype.hasOwnProperty.call(body, 'givenName') ||
  Object.prototype.hasOwnProperty.call(body, 'surname');

const updateBody = hasNameChange
  ? normalizeNameUpdate(body, await identityProviderService.getUserInfo(operation.data.identityId))
  : body;

await identityProviderService.updateUser(operation.data.identityId, updateBody);
~~~

Do not call `getUserInfo` for account-enable/disable or mobile-phone-only messages. Preserve `context.res = { done: true }` and current error propagation.

- [ ] **Step 4: Extend listener tests.**

Spy on `IdentityProviderService.prototype.getUserInfo` and `.updateUser`. Verify a given-name-only message fetches the identity and forwards:

~~~ts
expect(updateUserSpy).toHaveBeenCalledWith(identityId, {
  givenName: 'Jonathan',
  surname: 'Smith',
  displayName: 'Jonathan Smith'
});
~~~

Add surname-only and stale-display-name cases. Add an account-only case asserting `getUserInfo` was not called and `{ accountEnabled: false }` was forwarded unchanged. Restore spies after each test.

- [ ] **Step 5: Run listener and helper tests.**

~~~bash
npx jest --runInBand --silent \
  apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts \
  apps/users/v1-identity-operations-listener/index.spec.ts
~~~

Expected result: all assertions pass. If the test environment cannot connect to configured database/B2C services, record that as infrastructure failure and still run helper tests plus TypeScript checks.

## Task 5: Add failing Innovator dashboard tests

**Files:**

- Create: `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.spec.ts`
- Modify: `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.ts`

- [ ] **Step 1: Test split-name preference.**

Follow the existing Angular TestBed pattern from the Accessor dashboard spec. Supply a user with `givenName: 'Elizabeth'`, `surname: 'Jones'`, and conflicting `displayName: 'Liz Jones'`, then assert:

~~~ts
expect(component.user.displayName).toBe('Elizabeth Jones');
~~~

Mock dashboard data services if `ngOnInit` needs to run.

- [ ] **Step 2: Test legacy fallback.**

Supply a user with one missing split name and `displayName: 'Liz Jones'`. Assert the dashboard value and page-title greeting use `Liz Jones`.

- [ ] **Step 3: Run the dashboard spec before implementation.**

~~~bash
npx jest --config ./jest.config.json --runInBand --silent \
  src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.spec.ts
~~~

Expected result: the split-name test fails because the component currently reads `user.displayName` directly.

## Task 6: Implement frontend fallback usage

**Files:**

- Modify: `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.ts`
- Test: `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.spec.ts`

- [ ] **Step 1: Calculate the shared display name once.**

Import the existing `StringsHelper` and change the constructor logic to:

~~~ts
const user = this.ctx.user.getUserInfo();
const displayName = StringsHelper.getUserDisplayName(user.givenName, user.surname, user.displayName);

this.user = {
  displayName,
  // existing collections and timestamps
};

this.setPageTitle('Home', { hint: 'Hello' + (displayName ? ' ' + displayName : '') });
~~~

Do not create dashboard-specific fallback logic.

- [ ] **Step 2: Run the focused dashboard tests.**

~~~bash
npx jest --config ./jest.config.json --runInBand --silent \
  src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.spec.ts
~~~

Expected result: split-name and legacy-fallback tests pass.

- [ ] **Step 3: Run existing FE name-flow tests.**

~~~bash
npx jest --config ./jest.config.json --runInBand --silent \
  src/modules/feature-modules/admin/pages/users/user-new.component.spec.ts \
  src/modules/feature-modules/innovator/pages/first-time-signin/first-time-signin.component.spec.ts \
  src/modules/shared/pages/account/manage-details/manage-details-edit.component.spec.ts \
  src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.spec.ts
~~~

Expected result: all existing and new tests pass.

## Task 7: Protect the agreed legacy-user behavior

**Files:**

- Inspect/modify only as needed: `apps/users/v1-me-update/validation.schemas.ts`, its existing specs, and the existing manage-details specs.

- [ ] **Step 1: Cover backend required-name validation.**

Verify these payloads are rejected:

~~~ts
{ mobilePhone: '+441234567890', givenName: '', surname: '' }
{ mobilePhone: '+441234567890', givenName: 'Jane', surname: '' }
{ mobilePhone: '+441234567890', givenName: '', surname: 'Doe' }
~~~

Verify `{ mobilePhone: '+441234567890', givenName: 'Jane', surname: 'Doe' }` is accepted. Do not add auto-splitting or an alternate save path.

- [ ] **Step 2: Cover frontend prepopulation and completion flow.**

For a complete existing user, assert the role-specific manage-details outbound data contains both names with the unrelated fields being edited. For a legacy user with either split field blank, assert both required name steps remain necessary before submission.

- [ ] **Step 3: Run focused validation and manage-details tests.**

~~~bash
npx jest --runInBand --silent apps/users/v1-me-update

npx jest --config ./jest.config.json --runInBand --silent \
  src/modules/shared/pages/account/manage-details/manage-details-edit.component.spec.ts
~~~

Expected result: complete-name flows pass and incomplete-name payloads remain rejected.

## Task 8: Full verification and uncommitted handoff

- [ ] **Step 1: Type-check backend apps.**

~~~bash
cd innovation-service-backend-api
npm run app:configure --function-app=users/v1-identity-operations-listener
npm run app:configure --function-app=admin
npx tsc --noEmit -p apps/users/tsconfig.json
npx tsc --noEmit -p apps/admin/tsconfig.json
~~~

Expected result: both TypeScript checks exit 0. If the repository uses a different symlink function-app name, use the equivalent existing configuration command without changing source behavior.

- [ ] **Step 2: Run focused backend tests.**

~~~bash
npx jest --runInBand --silent \
  apps/admin/_services/users.service.spec.ts \
  apps/users/v1-identity-operations-listener/identity-name.helper.spec.ts \
  apps/users/v1-identity-operations-listener/index.spec.ts
~~~

Expected result: assertions pass; report external-service/database failures separately from code failures.

- [ ] **Step 3: Build frontend.**

~~~bash
cd ../innovation-service-transactional-frontend
npm run build:spa
~~~

Expected result: exit 0; existing bundle-size or browserslist warnings may remain.

- [ ] **Step 4: Run diff hygiene checks.**

~~~bash
cd ../innovation-service-backend-api
git diff --check
git status --short

cd ../innovation-service-transactional-frontend
git diff --check
git status --short
~~~

Expected result: no whitespace errors; only planned source/spec files and the uncommitted design/plan documents are present. Do not commit, stash, reset, or discard changes.

- [ ] **Step 5: Manually confirm final behavior.**

~~~text
existing B2C identity + admin names
  -> B2C givenName/surname/displayName overwritten before app linking

legacy missing split name + phone/job-title update
  -> still requires both names, as explicitly chosen

dashboard with split names and stale displayName
  -> displays split names

queued partial name update
  -> fetches missing counterpart and writes synchronized displayName

queued accountEnabled-only update
  -> remains partial and does not fetch identity
~~~

No commit is part of this plan.
