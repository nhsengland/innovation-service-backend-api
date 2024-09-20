import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationToRemoveOwnerNotNullConstraint1685442088807 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE innovation ALTER COLUMN owner_id uniqueidentifier`);

    await queryRunner.query(`
      UPDATE innovation
      SET innovation.owner_id = NULL
      WHERE innovation.owner_id IN (
        SELECT owner.id
        FROM innovation
        INNER JOIN [user] owner ON owner.id = innovation.owner_id
        WHERE owner.status = 'DELETED'
      )
    `);
  }

  public async down(): Promise<void> {}
}
