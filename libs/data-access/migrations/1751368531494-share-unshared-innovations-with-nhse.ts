import { type MigrationInterface, type QueryRunner } from 'typeorm';
export class ShareUnsharedInnovationsWithNhse1751368531494 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Get NHSE’s organisation_id
      DECLARE @OrgId UNIQUEIDENTIFIER =
            (SELECT id FROM organisation WHERE acronym = 'NHSE');

      -- Insert any missing shares in a single pass
      INSERT INTO innovation_share (innovation_id, organisation_id)
      SELECT  i.id, @OrgId
      FROM    innovation AS i
      WHERE  NOT EXISTS (SELECT 1
                        FROM   innovation_share AS s
                        WHERE  s.innovation_id  = i.id
                          AND  s.organisation_id = @OrgId);
      `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      
      `);
  }
}
