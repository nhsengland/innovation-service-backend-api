import type { MigrationInterface, QueryRunner } from 'typeorm';

export class innovationActionAlterDescriptionLength1634557339278 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_action" ALTER COLUMN description nvarchar(500) NOT NULL;`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_action" ALTER COLUMN description nvarchar(255) NOT NULL;`
    );
  }
}
