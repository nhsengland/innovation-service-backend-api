import type { MigrationInterface, QueryRunner } from 'typeorm'

export class userNullableType1675180606210 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "type" nvarchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      
      await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "type" nvarchar(255) NULL`);
    }

}
