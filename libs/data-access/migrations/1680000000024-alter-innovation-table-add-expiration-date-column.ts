import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationTableAddExpirationDateColumn1680000000024 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "innovation" ADD expires_at datetime2`
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "innovation" DROP COLUMN "expires_at"`
        );
    }

}
