import { type MigrationInterface, type QueryRunner } from 'typeorm';
export class CreateTableAnalyticsOrgsInactivityBreach1747993334164 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE analytics_organisation_inactivity_breach (
            date DATE NOT NULL,
            innovation_id UNIQUEIDENTIFIER NOT NULL,
            support_id UNIQUEIDENTIFIER NOT NULL,
            PRIMARY KEY (date, innovation_id, support_id)
        );

        CREATE TABLE job_tracker (
          job VARCHAR(255) NOT NULL PRIMARY KEY,
          date DATE NOT NULL
        );
      `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE analytics_organisation_inactivity_breach;
        DROP TABLE job_tracker;
      `);
  }
}
