import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterAnnouncementUserTableToAddInnovation1724765148066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "announcement_user" ADD "innovation_id" uniqueidentifier NULL`);

    await queryRunner.query(`
      ALTER TABLE "announcement_user" ADD CONSTRAINT "fk_announcement_user_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "announcement_user" DROP COLUMN "fk_announcement_user_innovation_id"`);
    await queryRunner.query(`ALTER TABLE "announcement_user" DROP COLUMN "innovation_id"`);
  }
}
