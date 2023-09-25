import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTaskMessageAddStatus1695381567881 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // For stage and production this will run on the same way so using a shortcut to simplify the code and assume it's
    // only open which will be the case the the innovation_task messages created
    await queryRunner.query(`
      ALTER TABLE innovation_task_message ADD "status" nvarchar(255) CONSTRAINT ck_task_message_status CHECK( status IN ('OPEN', 'DONE', 'DECLINED', 'CANCELLED') ) NOT NULL CONSTRAINT df_task_message_status DEFAULT 'OPEN';
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
