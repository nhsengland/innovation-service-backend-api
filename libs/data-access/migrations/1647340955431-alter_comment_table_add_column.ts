import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterCommentTableAddColumn1647340955431 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE comment ADD is_editable bit NOT NULL CONSTRAINT "df_comment_is_editable" DEFAULT 0;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`ALTER TABLE comment DROP CONSTRAINT "df_comment_is_editable";`);
    await queryRunner.query(`ALTER TABLE comment DROP COLUMN is_editable;`);

  }

}
