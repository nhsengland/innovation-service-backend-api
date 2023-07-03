import { extname, parse } from 'path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import {
  InnovationDocumentEntity,
  InnovationFileEntity,
  InnovationFileLegacyEntity,
  UserRoleEntity
} from '../../shared/entities';
import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '../../shared/enums';

export class migrateFilesFromEvidences1688052294220 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const documents = await queryRunner.manager
      .createQueryBuilder(InnovationDocumentEntity, 'document')
      .where('version = 202304')
      .getMany();

    // Get all files and respective evidence info from the IR documents
    const fileAndEvidenceMap = new Map<string, string>();
    for (const document of documents) {
      if (document.document.version === '202304') {
        for (const evidence of document.document.evidences ?? []) {
          for (const file of evidence.files ?? []) {
            fileAndEvidenceMap.set(file, evidence.id);
          }
        }
      }
    }
    const fileIds = [...fileAndEvidenceMap.keys()];

    // Now get the info from the files that are currently saved on legacy file entity
    const oldFiles = [];
    let start = 0;
    while (true) {
      const fileIdsSearch = fileIds.slice(start, start + 500);
      if (fileIdsSearch.length === 0) break;
      start += 500;

      const files = await queryRunner.manager
        .createQueryBuilder(InnovationFileLegacyEntity, 'file')
        .withDeleted()
        .innerJoin('file.innovation', 'innovation')
        .addSelect('innovation.owner_id', 'owner_id')
        .addSelect('innovation.created_by', 'innovation_created_by')
        .where('file.id IN (:...fileIds)', { fileIds: fileIdsSearch })
        .getRawMany();

      oldFiles.push(...files);
    }

    // Get all the roles
    const roles = await queryRunner.manager
      .createQueryBuilder(UserRoleEntity, 'role')
      .withDeleted()
      .select(['role.user_id', 'role.id'])
      .where('role.role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
      .getRawMany();
    const rolesMap = new Map<string, string>(roles.map(r => [r.user_id, r.role_id]));

    // Transform the old files to the new file structure
    const files = oldFiles.map(file =>
      InnovationFileEntity.verifyType({
        id: file.file_id,
        storageId: file.file_id + extname(file.file_display_file_name).slice(0, 5),
        contextType: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE,
        contextId: fileAndEvidenceMap.get(file.file_id),
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

  public async down(): Promise<void> {}
}
