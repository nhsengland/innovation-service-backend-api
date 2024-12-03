import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSystemUser1733243128510 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO [user] (created_at, created_by, updated_at, updated_by, id, external_id, status) 
      VALUES (GETDATE(), '00000000-0000-0000-0000-000000000000', GETDATE(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'DELETED');
      INSERT INTO user_role (created_at, created_by, updated_at, updated_by, id, role, user_id, is_active) 
      VALUES (GETDATE(), '00000000-0000-0000-0000-000000000000', GETDATE(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'ADMIN', '00000000-0000-0000-0000-000000000000', 0);`
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM [user_role] where user_id='00000000-0000-0000-0000-000000000000';
      DELETE FROM [user] where id='00000000-0000-0000-0000-000000000000';
    `);
  }
}
