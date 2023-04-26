import type { MigrationInterface, QueryRunner } from 'typeorm';

export class threadsAddColumnContexts1661174798831 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_thread" ADD context_id  uniqueidentifier NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "innovation_thread" ADD context_type  varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "innovation_thread" ADD CONSTRAINT "CK_innovation_thread_context_type" 
      CHECK (context_type IN ('NEEDS_ASSESSMENT','SUPPORT', 'ACTION'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_thread" DROP CONSTRAINT "CK_innovation_thread_context_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "innovation_thread" DROP COLUMN context_type
    `);

    await queryRunner.query(`
      ALTER TABLE "innovation_thread" DROP COLUMN context_id
    `);
  }
}
