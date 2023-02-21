import type { MigrationInterface, QueryRunner } from 'typeorm';

export class actionsAddDomainContext1675262960578 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE innovation_action ADD created_by_user_role_id uniqueidentifier NULL;
      `);

      await queryRunner.query(`
        ALTER TABLE innovation_action ADD updated_by_user_role_id uniqueidentifier NULL;
      `);

      await queryRunner.query(`
        ALTER TABLE innovation_action ADD CONSTRAINT "fk_innovation_action_created_by_user_role_id" FOREIGN KEY ("created_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);

      await queryRunner.query(`
        ALTER TABLE innovation_action ADD CONSTRAINT "fk_innovation_action_updated_by_user_role_id" FOREIGN KEY ("updated_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
            
        await queryRunner.query(`
          ALTER TABLE innovation_action DROP CONSTRAINT "fk_innovation_action_created_by_user_role_id";
        `);

        await queryRunner.query(`
        ALTER TABLE innovation_action DROP CONSTRAINT "fk_innovation_action_updated_by_user_role_id";
      `);
    
        await queryRunner.query(`
          ALTER TABLE innovation_action DROP COLUMN created_by_user_role_id;
        `);

        await queryRunner.query(`
        ALTER TABLE innovation_action DROP COLUMN updated_by_user_role_id;
      `);
    }

}
