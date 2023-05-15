import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableActivityLogFixUserRole1684147738086 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fetch the previous migration timestamp from the migration table
    const res = await queryRunner.query(
      `SELECT timestamp FROM Migrations WHERE name='alterTableActivityLogAddColumnUserRole1678898270292'`
    );

    const timestamp = res[0]?.timestamp;
    // This should never happen, just in case
    if (!timestamp) {
      throw new Error('Migration timestamp not found');
    }

    const date = new Date(Number(timestamp));

    await queryRunner.query(
      `
      UPDATE activity_log
      SET user_role_id = r.id
      FROM user_role r inner join (
        SELECT user_id, MIN(created_at) AS created FROM user_role GROUP BY user_id
      ) t ON r.user_id=t.user_id
      WHERE activity_log.created_at<@0
      AND activity_log.created_by=t.user_id
    `,
      [date]
    );
  }

  public async down(): Promise<void> {}
}
