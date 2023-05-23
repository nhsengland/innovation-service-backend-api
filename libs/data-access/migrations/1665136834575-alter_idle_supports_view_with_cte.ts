import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterIdleSupportsViewWithCTE1665136834575 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        
            CREATE OR ALTER   VIEW [dbo].[idle_support_view_entity]
            AS
            WITH
                supportsByInnovationAndUnit AS (
                    SELECT
                        U.id unitId,
                        I.id innovationId,
                        max(S.id) supportId,
                        max(S.status) supportStatus,
                        max(S.updated_at) latestSupportDate
                    FROM innovation I
                    INNER JOIN innovation_support S
                    ON I.id = S.innovation_id
                    INNER JOIN organisation_unit U
                    ON U.id = S.organisation_unit_id
                    WHERE S.status IN ('ENGAGING', 'FURTHER_INFO_REQUIRED')
                    GROUP BY U.id, I.id
                ),
                actionsByInnovationAndUnit AS (
                    SELECT
                        U.id unitId,
                        I.id innovationId,
                        max(A.id) actionId,
                        max(A.updated_at) latestActionDate
                    FROM innovation I
                    INNER JOIN innovation_support S ON i.id = s.innovation_id
                    INNER JOIN organisation_unit U ON s.organisation_unit_id = U.id
                    INNER JOIN innovation_action A ON a.innovation_support_id = s.id
                    WHERE A.status IN ('IN_REVIEW', 'REQUESTED')
                    GROUP BY u.id, i.id
                ),
                messagesByInnovationAndUnit AS (
                    SELECT
                        U.id unitId,
                        I.id innovationId,
                        MAX(M.id) messageId,
                        MAX(m.created_at) latestMessageDate
                    FROM innovation I
                    INNER JOIN innovation_support S on i.id = s.innovation_id
                    INNER JOIN organisation_unit U on U.id = S.organisation_unit_id
                    INNER JOIN innovation_thread T on t.innovation_id = i.id
                    INNER JOIN innovation_thread_message M on M.innovation_thread_id = T.id
                    GROUP BY U.id, I.id
                ),
                latestActivity AS (
                    SELECT 
                        DISTINCT
                        I.id,
                        S.supportId,
                        MAX(S.supportStatus) status,
                        (SELECT MAX(v) FROM (VALUES (MAX(s.latestSupportDate)), (MAX(A.latestActionDate)), (MAX(M.latestMessageDate))) as value(v)) as latestActivity
                    FROM innovation I 
                    INNER JOIN supportsByInnovationAndUnit S
                    ON I.id = S.innovationId
                    LEFT JOIN actionsByInnovationAndUnit A
                    ON I.id = A.innovationId
                    LEFT JOIN messagesByInnovationAndUnit M
                    on I.id = M.innovationId
                    GROUP BY i.id, S.supportId
                ),
                targetUsers as (
                    select
                        DISTINCT
                        CASE 
                            WHEN S.status = 'ENGAGING' THEN UAUser.id
                            WHEN S.status = 'FURTHER_INFO_REQUIRED' THEN UQAUser.id
                        END unitUserId,
                        U.id unitId,
                        LA.id innovationId,
                        LA.latestActivity
                        from latestActivity LA
                        INNER JOIN innovation_support S on LA.supportId = S.id
                        INNER join organisation_unit U on s.organisation_unit_id = U.id
                        LEFT JOIN organisation_unit_user UQAUser on UQAUser.organisation_unit_id = U.id and S.status = 'FURTHER_INFO_REQUIRED' and EXISTS(SELECT 1 FROM organisation_user where id = UQAUser.organisation_user_id and role = 'QUALIFYING_ACCESSOR')
                        LEFT JOIN organisation_unit_user UAUser on UAUser.organisation_unit_id = U.id and S.status = 'ENGAGING' and EXISTS(SELECT 1 FROM organisation_user where id = UAUser.organisation_user_id and role = 'QUALIFYING_ACCESSOR')
                        LEFT JOIN innovation_support_user ISU on s.status = 'ENGAGING' and isu.organisation_unit_user_id = UAUser.id
                        WHERE DATEDIFF(day, LA.latestActivity, GETDATE()) >= 90
            
                ),
                notificationLog as (
                    SELECT
                        nlogjson.innovationId innovationId,
                        nlogjson.unitId unitId,
                        MAX(nlog.created_at) created_at
                        FROM notification_log nlog
                        CROSS APPLY openjson(nlog.params)
                        WITH (
                        innovationId uniqueidentifier '$.innovationId',
                        unitId uniqueidentifier '$.unitId'
                        ) nlogjson
                    GROUP BY nlogjson.innovationId, nlogjson.unitId
                )
            
                SELECT
                    DISTINCT
                    u.external_id identityId,
                    t.unitId organisationUnitId,
                    T.innovationId AS innovationId,
                    i.name as innovationName,
                    Unit.name AS organisationUnitName,
                    I.owner_id as ownerId,
                    ownerUser.external_id as ownerIdentityId,
                    t.latestActivity latestActivity
                FROM targetUsers T
                INNER JOIN organisation_unit_user UU on UU.id = t.unitUserId
                INNER JOIN organisation_user OU on OU.id = uu.organisation_user_id
                INNER JOIN [User] U on u.id = ou.user_id and u.locked_at is null
                INNER JOIN innovation I ON i.id = T.innovationId
                INNER JOIN organisation_unit Unit ON unit.id = UU.organisation_unit_id
                INNER JOIN [user] ownerUser ON ownerUser.id = i.owner_id
                LEFT JOIN notificationLog L on L.innovationId = T.innovationId and L.unitId = T.unitId AND DATEDIFF(day, L.created_at, GETDATE()) < 30
                WHERE L.created_at IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW dbo.idle_support_view_entity');
  }
}
