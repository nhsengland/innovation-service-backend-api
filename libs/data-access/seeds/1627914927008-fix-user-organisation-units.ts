import type { QueryRunner } from 'typeorm';

export class fixUserOrganisationUnits1627914927008 {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DECLARE @originOrgUnitId as nvarchar(100);
      DECLARE @destOrgUnitId as nvarchar(100);

      -- RETRIEVE Org Id's
      SELECT @originOrgUnitId = id from organisation_unit where acronym = 'WoE';
      SELECT @destOrgUnitId = id from organisation_unit where acronym = 'WEAHSN';
        
      -- MOVE USERS TO THE NEW UNIT
      UPDATE organisation_unit_user 
      SET organisation_unit_id = @destOrgUnitId
      WHERE organisation_unit_id = @originOrgUnitId;
		`);
  }

  async down(): Promise<void> {}
}
