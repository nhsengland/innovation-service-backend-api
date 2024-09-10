import { TableColumn, type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlterTableAnnouncementsAddSendEmailColumn1724421232358 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'announcement',
      new TableColumn({
        name: 'send_email',
        type: 'bit',
        default: 0
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('announcement', 'send_email');
  }
}
