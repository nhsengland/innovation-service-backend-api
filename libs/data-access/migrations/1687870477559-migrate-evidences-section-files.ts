import type { MigrationInterface, QueryRunner } from 'typeorm';

import { extname, parse } from 'path';
import { InnovationFileEntity, UserRoleEntity } from '../../shared/entities';
import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '../../shared/enums';

export class migrateEvidencesSectionFiles1687870477559 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const roles = await queryRunner.manager
      .createQueryBuilder(UserRoleEntity, 'role')
      .withDeleted()
      .select(['role.user_id', 'role.id'])
      .where('role.role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
      .getRawMany();
    const rolesMap = new Map<string, string>(roles.map(r => [r.user_id, r.role_id]));

    const oldSectionFilesFromEvidences = await queryRunner.query(`
      SELECT f.*, i.created_by as innovation_created_by
      FROM innovation_file_legacy f
      INNER JOIN innovation i ON i.id = f.innovation_id
      INNER JOIN (
        SELECT value FROM innovation_document d
        CROSS APPLY openjson(d.document, '$.EVIDENCE_OF_EFFECTIVENESS.files')
      ) t ON f.id=t.value;
    `);

    const files = oldSectionFilesFromEvidences.map((file: any) =>
      InnovationFileEntity.verifyType({
        id: file.id,
        storageId: file.id + extname(file.display_file_name).slice(0, 5),
        contextType: InnovationFileContextTypeEnum.INNOVATION_SECTION,
        contextId: file.context,
        name: parse(file.display_file_name).name,
        description: null,
        innovation: { id: file.innovation_id },
        extension: extname(file.display_file_name).replace('.', '').slice(0, 4),
        filename: file.display_file_name,
        filesize: null,
        createdAt: file.created_at,
        createdBy: file.created_by ?? file.owner_id ?? file.innovation_created_by,
        createdByUserRole: { id: rolesMap.get(file.created_by ?? file.owner_id ?? file.innovation_created_by) },
        updatedAt: file.updated_at,
        updatedBy: file.updated_by ?? file.owner_id ?? file.innovation_created_by,
        deletedAt: file.deleted_at
      })
    );

    await queryRunner.manager.save(InnovationFileEntity, files, { chunk: 100 });
  }

  public async down(): Promise<void> {}
}
