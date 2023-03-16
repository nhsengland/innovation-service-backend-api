import type { MigrationInterface, QueryRunner } from 'typeorm';


export class alterTableUserRoleAddIsActive1678901838642 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user_role ADD locked_at datetime2 NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user_role DROP COLUMN locked_at`);
  }

}
