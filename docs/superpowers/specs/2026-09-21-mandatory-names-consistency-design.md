# Mandatory Names and Identity Consistency

## Status

Approved design, pending implementation-plan review.

## Goal

Make the mandatory given-name and surname change consistent across the backend and transactional frontend while preserving the agreed migration rule: legacy users must provide both split names before saving any profile change.

The work addresses four findings:

1. Admin-entered names can be ignored when an email already exists in B2C but not in the application database.
2. Legacy users with missing split names are blocked from saving unrelated profile changes.
3. The Innovator dashboard can read stale or blank `displayName` directly.
4. Partial queued identity updates can change split names without synchronizing `displayName`.

## Decisions

### B2C account reuse during admin creation

If the email already identifies a B2C account and no application user exists, the application will reuse that identity but update its names from the administrator's submitted values before linking it to the application user.

The effective values are:

```text
givenName   = submitted given name
surname     = submitted surname
displayName = `${givenName} ${surname}`
```

If the B2C update fails, application-user creation must not continue with an identity whose names were not successfully updated. The existing account-reuse and duplicate-application-user checks remain unchanged.

### Legacy users

The current mandatory-name behavior is intentional. A user whose identity has a blank `givenName` or `surname` must complete both fields before any profile update can be saved, including a phone-only or job-title-only update.

The implementation will not guess names by splitting `displayName`; names such as `Mary Jane Watson`, `O'Neil`, or mononyms cannot be split reliably. Existing split values will be prefilled in the frontend where present, and validation will continue to require both non-empty names.

This item is therefore a clarified and tested migration constraint, not a removal of the legacy-user block.

### Display-name presentation

The Innovator dashboard will use the same shared display-name helper as the other updated screens:

1. use trimmed `givenName + surname` when both are present;
2. otherwise fall back to the legacy `displayName`;
3. otherwise show no name suffix.

This keeps presentation behavior independent of any temporary inconsistency in the identity provider.

### Queued identity updates

Queued identity operations remain partial because the queue is also used for operations such as account enablement. However, any queued operation that changes `givenName` or `surname` must synchronize `displayName`.

The listener will detect whether either split-name property is explicitly present, including an explicit empty value. If so, it will obtain the current identity, merge the queued values with the current values, and derive `displayName` from the effective pair before applying the update. A caller-supplied `displayName` will not override this derived value for a name-changing operation.

Operations that do not change either split-name property will continue to pass through as partial updates.

## Data flow

### Synchronous profile update

The existing normal profile path remains the source of truth for name construction:

```text
frontend givenName/surname
  -> /v1/me validation
  -> backend derives displayName
  -> B2C update writes all three fields
  -> frontend state derives the same display name
```

### Admin creation with an existing B2C identity

```text
admin submits email + names
  -> find B2C identity by email
  -> reject if application user already exists
  -> update existing B2C identity with all three name fields
  -> create/link application user
```

### Queued name update

```text
queue message contains givenName and/or surname
  -> listener fetches current identity
  -> merge supplied values with current values
  -> derive displayName from merged names
  -> apply one synchronized B2C update
```

## Implementation boundaries

### Backend

- Update the existing-B2C branch in `apps/admin/_services/users.service.ts`.
- Keep name validation in the existing admin and `/v1/me` schemas; add or adjust tests to document the legacy rule.
- Add a small identity-name normalization/merge utility where it can be shared by the queued listener and its tests without changing unrelated account-enable operations.
- Update `apps/users/v1-identity-operations-listener/index.ts` to normalize name-changing queued messages before calling the identity provider.
- Preserve rollback/error behavior. A failed B2C name update must surface as a failed admin operation and must not silently create a partially initialized application user.

### Frontend

- Update `src/modules/feature-modules/innovator/pages/dashboard/dashboard.component.ts` to use the existing shared helper.
- Keep existing name forms and their required validation unchanged for the agreed legacy migration behavior.
- Add focused regression coverage for dashboard fallback behavior and existing-name form prepopulation where coverage is missing.

## Error handling

- Existing-B2C name-update failure: return the existing service error path; do not continue to application-user creation.
- Queued lookup or update failure: retain the listener's existing failure/retry behavior; do not acknowledge a message that was not successfully applied.
- Missing current surname/given name during a queued partial name update: use the supplied value plus the current value, then derive `displayName`; if the resulting required name pair is invalid, fail validation rather than constructing an ambiguous display name.
- Never derive names by splitting the legacy `displayName`.

## Tests and acceptance criteria

### Backend tests

- Existing B2C identity absent from the application database is updated with submitted `givenName`, `surname`, and derived `displayName`.
- The same path does not create an application user when the B2C update fails.
- A legacy identity with missing split names is rejected by profile-update validation until both names are supplied.
- A queued update containing only `givenName` merges the current surname and derives the new `displayName`.
- A queued update containing only `surname` merges the current given name and derives the new `displayName`.
- A queued update containing both split names derives `displayName` even if the message includes a stale display name.
- A non-name queued update, such as `{ accountEnabled: false }`, remains a partial pass-through.
- Explicit empty-name values are handled deterministically and do not bypass required-name validation.

### Frontend tests

- The Innovator dashboard uses split names when both exist.
- The dashboard falls back to legacy `displayName` when either split name is missing.
- Existing users with both names see those values prefilled and can continue through their role-specific edit flow.
- Legacy users with missing names remain required to complete both names before saving unrelated profile changes.

### Verification

- Run focused backend and frontend tests for the changed services/components.
- Run backend TypeScript checks for affected apps.
- Run the transactional frontend production build.
- Confirm `git diff --check` and clean review of both repositories.

## Out of scope

- Migrating all existing B2C users in bulk.
- Adding custom B2C extension attributes.
- Changing the required-name policy selected for legacy users.
- Replacing the queue or making all queue messages carry all identity fields.
- Unrelated profile, role, organisation, or account-enable behavior.
