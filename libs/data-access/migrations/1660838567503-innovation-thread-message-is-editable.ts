import type { MigrationInterface, QueryRunner } from 'typeorm';

export class innovationThreadMessageIsEditable1660838567503 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_message" ADD is_editable  bit DEFAULT 0`
    );

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_message" DROP COLUMN is_editable`
    );

  }

}
