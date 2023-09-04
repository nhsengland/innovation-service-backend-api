import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationSupportUserAddRole1693841351999 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // add new column user_role_id
    await queryRunner.query(
      `
      ALTER TABLE innovation_support_user
      ADD user_role_id uniqueidentifier NULL;
      `
    );

    // add data to new column
    await queryRunner.query(
      `
      UPDATE innovation_support_user
      SET user_role_id = user_role.id
      FROM innovation_support_user
      JOIN organisation_unit_user ON innovation_support_user.organisation_unit_user_id = organisation_unit_user.id
      JOIN organisation_user ON organisation_user.id = organisation_unit_user.organisation_user_id
      JOIN user_role ON organisation_user.user_id = user_role.user_id AND organisation_unit_user.organisation_unit_id = user_role.organisation_unit_id;
      `
    );

    // set as foreign key
    await queryRunner.query(
      `
      ALTER TABLE "innovation_support_user" ADD CONSTRAINT "fk_innovation_support_user_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      `
    );

    // change to NOT NULL
    await queryRunner.query(
      `
      ALTER TABLE "innovation_support_user"
      ALTER COLUMN user_role_id uniqueidentifier NOT NULL
      `
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE innovation_support_user
      DROP COLUMN user_role_id
    `);

    await queryRunner.query(`
      ALTER TABLE innovation_support_user
      DROP CONSTRAINT "fk_innovation_support_user_user_role_id" 
    `);
  }
}
