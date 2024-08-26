import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createAnnouncementInnovationTable1724683464771 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "announcement_innovation" (
          "announcement_id" uniqueidentifier NOT NULL,
          "innovation_id" uniqueidentifier NOT NULL,
          CONSTRAINT "pk_announcement_innovation_announcement_id_innovation_id" PRIMARY KEY ("announcement_id", "innovation_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_announcement_innovation_innovation_id" ON "announcement_innovation" ("innovation_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_announcement_innovation_innovation_id" ON "announcement_innovation"`);
    await queryRunner.query(`DROP TABLE "announcement_innovation"`);
  }
}
