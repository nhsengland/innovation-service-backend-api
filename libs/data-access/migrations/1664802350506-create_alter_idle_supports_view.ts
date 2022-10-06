import type { MigrationInterface, QueryRunner } from "typeorm"

export class migrations1664802350506 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        
            CREATE OR ALTER VIEW dbo.idle_support_view_entity
            AS
            SELECT
            I.id as innovationId,
            io.external_id as ownerIdentityId,
            io.id as ownerId,
            I.name as innovationName,
            UU.organisation_unit_id as organisationUnitId,
            s.id as supportId,
            usr.external_id as identityId,
            unit.name organisationUnitName,
            (SELECT MAX(v) FROM (VALUES (MAX(L.latest)), (MAX(l2.latest)), (MAX(l3.latest))) as value(v)) as latestActivity
            FROM innovation I
            INNER JOIN innovation_support S
            ON I.id = S.innovation_id
            INNER JOIN [user] IO ON i.owner_id = IO.id
            INNER JOIN innovation_support_user SU 
            ON S.id = SU.innovation_support_id
            INNER JOIN organisation_unit_user UU ON UU.id = SU.organisation_unit_user_id
            INNER JOIN organisation_unit Unit ON unit.id = uu.organisation_unit_id
            INNER JOIN organisation_user OU on OU.id = UU.organisation_user_id
            INNER JOIN [user] USR ON USR.id = OU.user_id
            INNER JOIN (
            SELECT
            u_u.id unit,
            i_i.id innovation,
            max(s_s.id) maxSupport,
            max(s_s.updated_at) latest
            FROM innovation_support S_S
            INNER JOIN innovation I_I ON I_I.id = S_S.innovation_id
            INNER JOIN organisation_unit U_U ON U_U.id = S_S.organisation_unit_id
            GROUP BY U_U.id, I_I.id
            ) L ON I.id = L.innovation and S.id = L.maxSupport and L.latest = S.updated_at
            LEFT JOIN (
            SELECT
            u_u.id unit,
            i_i.id innovation,
            max(A_A.id) maxAction,
            max(A_A.innovation_support_id) maxSupport,
            max(A_A.updated_at) latest
            FROM innovation_support S_S
            INNER JOIN innovation I_I ON I_I.id = S_S.innovation_id
            INNER JOIN organisation_unit U_U ON U_U.id = S_S.organisation_unit_id
            LEFT JOIN innovation_action A_A on A_A.innovation_support_id = S_S.id
            WHERE A_A.status = 'IN_REVIEW'
            GROUP BY U_U.id, I_I.id
            ) L2 ON I.id = L2.innovation and S.id = L2.maxSupport and l2.latest = S.updated_at
            LEFT JOIN (
            SELECT
            u_u.id unit,
            i_i.id innovation,
            max(s_s.id) maxSupport,
            max(m_m.created_at) latest
            FROM innovation_support S_S
            INNER JOIN innovation I_I ON I_I.id = S_S.innovation_id
            INNER JOIN organisation_unit U_U ON U_U.id = S_S.organisation_unit_id
            INNER JOIN innovation_thread T_T on T_T.innovation_id = I_I.id
            INNER JOIN innovation_thread_message M_M on M_M.innovation_thread_id = T_T.id
            GROUP BY U_U.id, I_I.id
            ) L3 ON I.id = L3.innovation and S.id = L3.maxSupport
            LEFT JOIN (
                SELECT
                nlog.id logId,
                nlogjson.innovationId,
                nlogjson.unitId,
                nlog.created_at
                FROM notification_log nlog
                CROSS APPLY openjson(nlog.params)
                WITH (
                innovationId uniqueidentifier '$.innovationId',
                unitId uniqueidentifier '$.unitId'
                ) nlogjson
            ) nlog ON nlog.innovationId = i.id and nlog.unitId = uu.organisation_unit_id
            WHERE S.status IN ('ENGAGING','FURTHER_INFO_REQUIRED')
            AND DATEDIFF(day, L.latest, GETDATE()) >= 90
            AND (DATEDIFF(day, L2.latest, GETDATE()) >= 90 or L2.latest IS NULL)
            AND (DATEDIFF(day, L3.latest, GETDATE()) >= 90 OR L3.latest IS NULL)
            AND (DATEDIFF(day, nlog.created_at, GETDATE()) >= 30 OR nlog.created_at IS NULL)
            GROUP BY i.id,io.external_id,io.id, i.name, uu.organisation_unit_id, unit.name, s.id, usr.external_id`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('DROP VIEW dbo.idle_support_view_entity')
    }

}
