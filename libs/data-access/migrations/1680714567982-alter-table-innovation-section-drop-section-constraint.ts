import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationSectionDropSectionConstraint1680714567982
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Need to fetch the name of the constraint to drop it since it's not a named constraint
    const res = await queryRunner.query(`
      SELECT c.name
      FROM
        sys.tables t
        JOIN sys.check_constraints c ON c.parent_object_id = t.object_id
        JOIN sys.columns col ON col.object_id = t.object_id
          AND col.column_id = c.parent_column_id
      WHERE
        t.name = 'innovation_section'
        AND col.name = 'section'
    `);

    if (res?.length === 1) {
      await queryRunner.query(`
        ALTER TABLE innovation_section DROP CONSTRAINT ${res[0].name};
      `);
    }
  }

  public async down(): Promise<void> {}
}
