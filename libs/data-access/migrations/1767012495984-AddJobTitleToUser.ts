import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobTitleToUser1767012495984 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "job_title" nvarchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "job_title"`);
    }

}
