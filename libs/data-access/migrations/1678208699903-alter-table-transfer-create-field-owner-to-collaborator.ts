import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationTransferCreateFieldOwnerToCollaborator1678208699903
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_transfer" ADD "owner_to_collaborator" bit NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_transfer" DROP COLUMN "owner_to_collaborator"
    `);
  }
}
