import { extname, parse } from 'path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { InnovationFileLegacyEntity } from '../../shared/entities/innovation/innovation-file-legacy.entity';
import { InnovationFileEntity } from '../../shared/entities/innovation/innovation-file.entity';
import { UserRoleEntity } from '../../shared/entities/user/user-role.entity';
import { InnovationFileContextTypeEnum } from '../../shared/enums/innovation.enums';
import { ServiceRoleEnum } from '../../shared/enums/user.enums';

export class createTableInnovationFileNew1686047954615 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE innovation_file(
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_file_created_at" DEFAULT getdate(),
        "created_by" uniqueidentifier NOT NULL,
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_file_updated_at" DEFAULT getdate(),
        "updated_by" uniqueidentifier NOT NULL,
        "deleted_at" datetime2 NULL,
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_innovation_file_id" DEFAULT NEWSEQUENTIALID(),
        "storage_id" nvarchar(100) NOT NULL,
        "context_type" nvarchar(100) NOT NULL,
        "context_id" nvarchar(100) NOT NULL,
        "name" nvarchar(100) NOT NULL,
        "description" nvarchar(500) NULL,
        "filename" nvarchar(100) NOT NULL,
        "filesize" int NULL,
        "extension" nvarchar(10) NOT NULL,
        "innovation_id" uniqueidentifier NOT NULL,
        "created_by_user_role_id" uniqueidentifier NOT NULL,
        CONSTRAINT "pk_innovation_file_id" PRIMARY KEY ("id")
      )
   `);

    await queryRunner.query(`
      ALTER TABLE "innovation_file" ADD CONSTRAINT "fk_innovation_file_created_by_user_role_id" FOREIGN KEY ("created_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      ALTER TABLE "innovation_file" ADD CONSTRAINT "fk_innovation_file_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);

    const roles = await queryRunner.manager
      .createQueryBuilder(UserRoleEntity, 'role')
      .withDeleted()
      .select(['role.user_id', 'role.id'])
      .where('role.role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
      .getRawMany();
    const rolesMap = new Map<string, string>(roles.map(r => [r.user_id, r.role_id]));

    const oldFiles = await queryRunner.manager
      .createQueryBuilder(InnovationFileLegacyEntity, 'file')
      .withDeleted()
      .innerJoin('file.innovation', 'innovation')
      .addSelect('innovation.owner_id', 'owner_id')
      .addSelect('innovation.created_by', 'innovation_created_by')
      .where('file.context IN (:...contexts)', {
        contexts: [
          'UNDERSTANDING_OF_NEEDS',
          'TESTING_WITH_USERS',
          'REGULATIONS_AND_STANDARDS',
          'IMPLEMENTATION_PLAN',
          'DEPLOYMENT'
        ]
      })
      .getRawMany();

    const files = oldFiles.map(file =>
      InnovationFileEntity.verifyType({
        id: file.file_id,
        storageId: file.file_id + extname(file.file_display_file_name).slice(0, 5),
        contextType: InnovationFileContextTypeEnum.INNOVATION_SECTION,
        contextId: file.file_context,
        name: parse(file.file_display_file_name).name,
        description: null,
        innovation: { id: file.file_innovation_id },
        extension: extname(file.file_display_file_name).replace('.', '').slice(0, 4),
        filename: file.file_display_file_name,
        filesize: null,
        createdAt: file.file_created_at,
        createdBy: file.file_created_by ?? file.owner_id ?? file.innovation_created_by,
        createdByUserRole: { id: rolesMap.get(file.file_created_by ?? file.owner_id ?? file.innovation_created_by) },
        updatedAt: file.file_updated_at,
        updatedBy: file.file_updated_by ?? file.owner_id ?? file.innovation_created_by,
        deletedAt: file.file_deleted_at
      })
    );

    await queryRunner.manager.save(InnovationFileEntity, files, { chunk: 100 });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_file" DROP CONSTRAINT "pk_innovation_file_id"`);
    await queryRunner.query(
      `ALTER TABLE "innovation_file" DROP CONSTRAINT "fk_innovation_file_created_by_user_role_id"`
    );
    await queryRunner.query(`ALTER TABLE "innovation_file" DROP CONSTRAINT "fk_innovation_file_innovation_id"`);

    await queryRunner.query(`DROP TABLE "innovation_file"`);
  }
}
