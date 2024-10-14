import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCreatedAndUpdatedByRoleToSupports1728489444900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ADD the columns
    await queryRunner.query(`
      ALTER TABLE innovation_support ADD created_by_user_role_id UNIQUEIDENTIFIER CONSTRAINT "df_temp_created_by_user_role" DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL;
      ALTER TABLE innovation_support ADD updated_by_user_role_id UNIQUEIDENTIFIER CONSTRAINT "df_temp_updated_by_user_role" DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL;
    `);

    /*
     * Add the supports != SUGGESTED
     *
     * We have to get the org_created_by_role fallback since in prod there were supports that were migrated from
     * one unit to another (NICE and AI). Since the s.organisation_unit was different from the the support unit
     * we had to get the role that the user had from the organisation.
     */
    await queryRunner.query(`
      WITH
          not_suggested_supports
          AS
          (
              SELECT s.id as support_id, COALESCE(created_by_role.id, org_created_by_role.id) as created_by_user_role_id, updated_by_role.id as updated_by_user_role_id
              FROM innovation_support s
                  LEFT JOIN user_role created_by_role ON created_by_role.user_id = s.created_by AND created_by_role.organisation_unit_id = s.organisation_unit_id
                  LEFT JOIN user_role org_created_by_role ON created_by_role.id IS NULL AND org_created_by_role.user_id = s.created_by
                  INNER JOIN user_role updated_by_role ON updated_by_role.user_id = s.updated_by AND (updated_by_role.role = 'INNOVATOR' OR updated_by_role.organisation_unit_id = s.organisation_unit_id)
              WHERE s.[status] != 'SUGGESTED'
          )
      UPDATE innovation_support
      SET created_by_user_role_id = nss.created_by_user_role_id, updated_by_user_role_id = nss.updated_by_user_role_id
      FROM innovation_support s
          INNER JOIN not_suggested_supports nss ON nss.support_id = s.id
      WHERE s.id = nss.support_id;
    `);

    // Add the supports == SUGGESTED from NAs
    await queryRunner.query(`
      WITH
          suggested_by_na
          AS
          (
              SELECT s.id as support_id, r.id as suggestor_role_id
              FROM innovation i
                  INNER JOIN innovation_support s ON s.innovation_id = i.id AND s.deleted_at IS NULL
                  INNER JOIN innovation_assessment a ON a.id = i.current_assessment_id AND a.finished_at IS NOT NULL
                  INNER JOIN innovation_assessment_organisation_unit aou ON aou.innovation_assessment_id = a.id AND aou.organisation_unit_id = s.organisation_unit_id
                  INNER JOIN user_role r ON r.user_id = a.assign_to_id AND r.role = 'ASSESSMENT'
              WHERE s.status = 'SUGGESTED'
          )
      UPDATE innovation_support
      SET created_by_user_role_id = sbn.suggestor_role_id, updated_by_user_role_id = sbn.suggestor_role_id
      FROM innovation_support s
          INNER JOIN suggested_by_na sbn ON sbn.support_id = s.id
      WHERE s.id = sbn.support_id;
    `);

    // Add the supports == SUGGESTED from QAs
    await queryRunner.query(`
      WITH
          suggested_by_qas
          AS
          (
              SELECT s.id as support_id, r.id as suggestor_role_id
              FROM innovation_support s
                  INNER JOIN innovation_support_log sl ON sl.created_at = s.created_at AND sl.innovation_id = s.innovation_id
                  INNER JOIN innovation_support_log_organisation_unit slou ON slou.innovation_support_log_id = sl.id AND slou.organisation_unit_id = s.organisation_unit_id
                  INNER JOIN user_role r ON r.id = sl.created_by_user_role_id AND r.organisation_unit_id = sl.organisation_unit_id
              WHERE s.status = 'SUGGESTED' AND s.created_by_user_role_id != '00000000-0000-0000-0000-000000000000'
          )
      UPDATE innovation_support
      SET created_by_user_role_id = sbq.suggestor_role_id, updated_by_user_role_id = sbq.suggestor_role_id
      FROM innovation_support s
          INNER JOIN suggested_by_qas sbq ON sbq.support_id = s.id
      WHERE s.id = sbq.support_id;
    `);

    // Lastly the ones that were unassigned.
    await queryRunner.query(`
      UPDATE innovation_support
      SET created_by_user_role_id = created_by_role.id, updated_by_user_role_id = updated_by_role.id
      FROM innovation_support s
          LEFT JOIN user_role created_by_role ON created_by_role.user_id = s.created_by AND created_by_role.organisation_unit_id = s.organisation_unit_id
          LEFT JOIN user_role org_created_by_role ON created_by_role.id IS NULL AND org_created_by_role.user_id = s.created_by
          INNER JOIN user_role updated_by_role ON updated_by_role.user_id = s.updated_by AND (updated_by_role.role = 'INNOVATOR' OR updated_by_role.organisation_unit_id = s.organisation_unit_id)
      WHERE (s.created_by_user_role_id = '00000000-0000-0000-0000-000000000000' OR s.updated_by_user_role_id = '00000000-0000-0000-0000-000000000000');
    `);

    // Remove the default id constraint
    await queryRunner.query(`
      ALTER TABLE innovation_support DROP CONSTRAINT "df_temp_created_by_user_role";
      ALTER TABLE innovation_support DROP CONSTRAINT "df_temp_updated_by_user_role";
    `);
  }

  public async down(): Promise<void> {}
}
