# Support status across assessments: release and rollback

## Scope

Migration: `1792368000000-count-support-across-assessments.ts`.

- For IN_PROGRESS innovations, non-deleted ENGAGING/WAITING support counts across assessments. No new `is_most_recent` filter is introduced.
- With no ongoing support, count non-deleted CLOSED/UNSUITABLE support whose closure is on/after the current major assessment's completion. Use the latest qualifying closure, regardless of the support's original assessment link.
- Suggested records do not block a qualifying closure/countdown. A minor assessment edit does not reset the closure cutoff.
- Other lifecycle labels, view columns, six-calendar-month date expressions and the environment's deployment-date baseline remain unchanged.
- No support records, links, messages, tasks or assigned users are repaired or replaced by the migration.

This document is a runbook, not evidence of deployment. Only local development/test execution is authorised by the implementation task. Stage/production deployment, real notifications and archiving need the normal authorised release process. Reda handles Elasticsearch manually; no refresh scripts or refresh tests are included.

## Before applying in any shared environment

1. Confirm the target server/database and the reviewed migrations artifact. This is the migrations release; a frontend/function-app-only deployment does not change the SQL view. Review pending migrations so an unrelated change is not applied accidentally.
   Use TypeORM's transactional migration mode (the repository commands use its default). SQL Server's query runner pins a physical session only while a transaction is active; the SET options and ALTER VIEW must use that session. Do not run this migration with `--transaction none`.
2. Capture the exact original view definition, module options, output metadata and deployed dependencies below. Save them with the release record. The migration identity must be able to read the definition and alter the view. A NULL definition is a blocker; do not substitute a guessed baseline or rerun the historical migration that uses `new Date()`.
3. Run the read-only impact comparison. Review status changes **and date-only changes** with reminder/archive eligibility. Inspect stale/non-current ongoing support but do not clean it up as part of this fix: it continues to count, matching the approved original behaviour.
4. Compare representative SELECT execution plans and logical reads before/after in stage. Review additional deployed view consumers and the deployed Tableau version; checked-in V16/V17 SQL has no direct grouped-status reference, but actual archiving changes lifecycle history used in reporting.
5. Arrange the release window around automatic reminders/archive jobs and long-running readers. The archive timer is configured as `0 0 2 * * *`; verify deployed timezone settings. Do not disable jobs without authorisation. ALTER VIEW can block on schema locks despite not updating data rows.

```sql
SELECT @@SERVERNAME AS server_name, DB_NAME() AS database_name;

SELECT definition, uses_ansi_nulls, uses_quoted_identifier
FROM sys.sql_modules
WHERE object_id = OBJECT_ID(N'dbo.innovation_grouped_status_view_entity', N'V');

SELECT column_id, name, system_type_id, max_length, precision, scale, is_nullable
FROM sys.columns
WHERE object_id = OBJECT_ID(N'dbo.innovation_grouped_status_view_entity')
ORDER BY column_id;

SELECT OBJECT_SCHEMA_NAME(referencing_id) AS dependent_schema,
       OBJECT_NAME(referencing_id) AS dependent_object
FROM sys.sql_expression_dependencies
WHERE referenced_id = OBJECT_ID(N'dbo.innovation_grouped_status_view_entity');

SELECT o.name, o.type_desc,
       USER_NAME(p.grantee_principal_id) AS grantee,
       USER_NAME(p.grantor_principal_id) AS grantor,
       p.minor_id, p.permission_name, p.state_desc
FROM sys.database_permissions p
JOIN sys.objects o ON o.object_id = p.major_id
WHERE o.object_id = OBJECT_ID(N'dbo.innovation_grouped_status_view_entity');
```

## Read-only impact comparison

Run **before migration**. It compares the old live calculation with the approved candidate. It does not create/alter a view or modify persistent data. The baseline extraction accepts a single distinct ISO date literal in the captured view; if the definition uses a different shape or additional date literals, stop and review rather than assume a date. Capture the full definition independently even if extraction succeeds.

GETDATE() is captured once to avoid a midnight boundary changing selection during this comparison. Reminder checks use exact days 30/90/150; archiving uses a date strictly before now. Six months means DATEADD(MONTH, 6, ...), not 180 days.

```sql
DECLARE @definition nvarchar(max) =
    OBJECT_DEFINITION(OBJECT_ID(N'dbo.innovation_grouped_status_view_entity', N'V'));
IF @definition IS NULL
    THROW 51000, 'Cannot read view definition; capture it with the authorised migration identity.', 1;

DECLARE @pattern nvarchar(100) =
    N'%''[12][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]''%';
DECLARE @position int = PATINDEX(@pattern, @definition);
IF @position = 0
    THROW 51000, 'No recognised archive baseline literal; inspect the deployed view.', 1;

DECLARE @literal nvarchar(12) = SUBSTRING(@definition, @position, 12);
DECLARE @baseline datetime2 = TRY_CONVERT(date, SUBSTRING(@literal, 2, 10), 23);
IF @baseline IS NULL OR PATINDEX(@pattern, REPLACE(@definition, @literal, N'')) > 0
    THROW 51000, 'Ambiguous/invalid baseline literals; inspect the deployed view.', 1;

DECLARE @now datetime = GETDATE();

WITH ongoing AS (
    SELECT DISTINCT innovation_id
    FROM dbo.innovation_support
    WHERE deleted_at IS NULL AND status IN ('ENGAGING', 'WAITING')
), qualifying_closed AS (
    SELECT s.innovation_id, MAX(s.finished_at) AS finished_at
    FROM dbo.innovation_support s
    JOIN dbo.innovation i ON i.id = s.innovation_id AND i.status = 'IN_PROGRESS'
    JOIN dbo.innovation_assessment a ON a.id = i.current_major_assessment_id
    WHERE s.deleted_at IS NULL
      AND s.status IN ('CLOSED', 'UNSUITABLE')
      AND a.finished_at IS NOT NULL
      AND s.finished_at >= a.finished_at
    GROUP BY s.innovation_id
), candidate AS (
    SELECT i.id, i.unique_id, i.status,
        v.grouped_status AS old_status,
        CASE WHEN i.status <> 'IN_PROGRESS' THEN v.grouped_status
             WHEN e.innovation_id IS NOT NULL THEN 'RECEIVING_SUPPORT'
             WHEN c.innovation_id IS NOT NULL THEN 'NO_ACTIVE_SUPPORT'
             ELSE 'AWAITING_SUPPORT' END AS new_status,
        v.days_since_no_active_support AS old_idle_days,
        DATEDIFF(DAY, c.finished_at, @now) AS new_idle_days,
        v.days_since_no_active_support_or_deploy AS old_reminder_days,
        CASE WHEN c.finished_at IS NULL THEN NULL
             ELSE DATEDIFF(DAY, CASE WHEN c.finished_at > @baseline
                                    THEN c.finished_at ELSE @baseline END, @now)
             END AS new_reminder_days,
        v.expected_archive_date AS old_archive_date,
        CASE WHEN c.finished_at IS NULL THEN NULL
             ELSE DATEADD(MONTH, 6, CASE WHEN c.finished_at > @baseline
                                       THEN c.finished_at ELSE @baseline END)
             END AS new_archive_date
    FROM dbo.innovation i
    JOIN dbo.innovation_grouped_status_view_entity v ON v.id = i.id
    LEFT JOIN ongoing e ON e.innovation_id = i.id
    LEFT JOIN qualifying_closed c ON c.innovation_id = i.id
    WHERE i.deleted_at IS NULL
), compared AS (
    SELECT *,
        IIF(old_status = 'NO_ACTIVE_SUPPORT' AND old_reminder_days IN (30,90,150), 1, 0) AS reminder_before,
        IIF(new_status = 'NO_ACTIVE_SUPPORT' AND new_reminder_days IN (30,90,150), 1, 0) AS reminder_after,
        IIF(old_status = 'NO_ACTIVE_SUPPORT' AND old_archive_date < @now, 1, 0) AS archive_before,
        IIF(new_status = 'NO_ACTIVE_SUPPORT' AND new_archive_date < @now, 1, 0) AS archive_after
    FROM candidate
)
SELECT *, COUNT(*) OVER (PARTITION BY old_status, new_status) AS transition_count
FROM compared
WHERE old_status <> new_status
   OR old_archive_date <> new_archive_date
   OR (old_archive_date IS NULL AND new_archive_date IS NOT NULL)
   OR (old_archive_date IS NOT NULL AND new_archive_date IS NULL)
   OR ISNULL(old_idle_days, -2147483648) <> ISNULL(new_idle_days, -2147483648)
   OR ISNULL(old_reminder_days, -2147483648) <> ISNULL(new_reminder_days, -2147483648)
   OR reminder_before <> reminder_after
   OR archive_before <> archive_after
ORDER BY old_status, new_status, id;
```

Review all rows; do not rely on a top-N sample. In particular:

- Old-assessment ongoing support can remove an innovation from inactivity reminder/archive selection.
- A newly qualifying cross-assessment closure can introduce archive eligibility; dates may already be overdue.
- A pre-completion closure can stop qualifying and move No active support to Awaiting support.
- Labels can stay No active support while the effective closure/archive date changes.
- No new isMostRecent-based demotion is intended. Preserve existing handling of non-current records.
- NULL current-major pointers/completion, future-dated closures and inconsistent sharing are data-quality findings for review, not permission to repair data.
- The comparison is a point-in-time read. Capture results immediately before rollout and reconcile live changes afterward; it is not a guarantee that users/jobs stopped changing records.

## Stage checks

1. Apply the reviewed migration in dev/stage; compare saved/new definitions. Only approved ongoing/closure predicates should change. Confirm the original baseline, columns, options, grants and dependent views are preserved.
2. Reproduce: assessment 1 recommends A; leave A Suggested; complete reassessment recommending A again; A starts Engaging. Overview must show Receiving support; support summary retains Engaging. Repeat Waiting with its proper individual label.
3. End that old-assessment support after current-major completion: expect No active support and the latest qualifying closure date. Another ongoing unit must keep Receiving support. A Suggested unit must not block No active support.
4. Verify a closure before major completion is excluded; minor edits do not reset the cutoff. Inspect initial assessment, reassessment, archived and withdrawn labels.
5. Verify real reminder/archive selectors using stage-only fixtures or read-only comparison; do not send notifications or archive real records to test eligibility. Confirm normal expiry archiving is a separate unchanged process.
6. Reda handles Elasticsearch refresh manually. No refresh code, scripts or automated refresh tests are part of this change.
7. Compare representative deployed report results. Changing support IDs/dates/history is not expected; lifecycle effects from real archiving remain possible.

## Production release

- Use the authorised migration-release process only after local tests, stage validation and impact review. Keep the prior definition/metadata and exact applied artifact revision in the release record.
- If permission/definition guards, schema locks, timeouts or unexpected pending migrations prevent application, stop and inspect the SQL transaction and migration ledger before retrying.
- Verify the new calculation against the saved candidate results and recheck reminder/archive eligibility. For RedactShield (`A58C18B2-D42D-F111-8EF3-7C1E522D6300`), Receiving support is expected only if it is still IN_PROGRESS with the previously observed non-deleted ongoing support; do not assume old production observations are today's state.
- Reda handles Elasticsearch manually after deployment and after rollback if needed.

## Rollback

1. Inspect the migration ledger. Use this migration's `down()` only when reverting it is valid in the release sequence; never blindly revert a newer unrelated migration.
2. `down()` restores the old assessment-bound ongoing/closure predicates. It must preserve the existing environment's archive baseline and module metadata. A separately reviewed forward rollback is needed if later migrations have altered the same view.
3. Read back definition, columns and dependent views, then compare labels/dates/eligibility again. Rollback can reintroduce overdue archive eligibility; arrange timing around jobs just as for deployment.
4. Reda handles any Elasticsearch refresh manually. Do not assume restoring the SQL view restores a separately stored search label automatically.
5. Rollback changes the calculation only. It cannot undo sent emails, missed exact-day reminders, automatic archives, cancelled tasks, closed supports, cleared assignments, rejected exports or downstream lifecycle/report history. Inventory those effects and use separately authorised recovery; do not automatically reopen/relink data.

## Verification evidence to retain

- Initial regression failed for the original SQL mismatch, then passed with the migration.
- SQL-backed status/date/consumer-selector cases and apply/revert/reapply checks passed against the disposable local test DB; only external actions were mocked.
- TypeScript/lint results, environment baseline/metadata preservation, impact comparison, stage/UI results and review findings.
- Release identity/artifact, migration ledger state, rollback owner and any follow-up data-quality findings.
