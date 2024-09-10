import { TableColumn, type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlterTableAnnouncementsAddFiltersColumn1724159752116 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'announcement',
      new TableColumn({
        name: 'filters',
        type: 'nvarchar',
        length: 'max',
        isNullable: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('announcement', 'filters');
  }
}
