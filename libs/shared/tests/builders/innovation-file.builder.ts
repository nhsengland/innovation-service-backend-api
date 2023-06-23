import { rand, randFileName, randNumber, randText, randUuid } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationFileEntity } from '../../entities/innovation/innovation-file.entity';
import type { InnovationFileContextTypeEnum } from '../../enums/innovation.enums';
import { BaseBuilder } from './base.builder';

export type TestFileType = {
  id: string;
  storageId: string;
  name: string;
  description?: string;
  context: {
    id: string;
    type: InnovationFileContextTypeEnum;
  };
  file: {
    name: string;
    size?: number;
    extension: string;
  };
  createdAt: Date | string;
};

export class InnovationFileBuilder extends BaseBuilder {
  private file: DeepPartial<InnovationFileEntity>;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    const name = randFileName();
    const extension = rand(['.pdf', '.xlsx', '.csv', '.docx']);
    this.file = {
      name: name,
      storageId: randUuid() + extension,
      description: randText(),
      createdAt: new Date(),
      filename: name + extension,
      extension: extension.replace('.', ''),
      filesize: randNumber()
    };
  }

  setCreatedByUserRole(roleId: string): this {
    this.file.createdByUserRole = { id: roleId };
    this.file.createdBy = roleId;
    this.file.updatedBy = roleId;
    return this;
  }

  setContext(context: { id: string; type: InnovationFileContextTypeEnum }): this {
    this.file.contextId = context.id;
    this.file.contextType = context.type;
    return this;
  }

  setInnovation(innovationId: string) {
    this.file.innovation = { id: innovationId };
    return this;
  }

  setName(name: string): this {
    this.file.name = name;
    return this;
  }

  setDescription(description: null | string): this {
    this.file.description = description;
    return this;
  }

  setSize(size: null | number): this {
    this.file.filesize = size;
    return this;
  }

  setCreatedAt(date: Date): this {
    this.file.createdAt = date;
    return this;
  }

  async save(): Promise<TestFileType> {
    const savedFile = await this.getEntityManager().getRepository(InnovationFileEntity).save(this.file);
    const file = await this.getEntityManager()
      .createQueryBuilder(InnovationFileEntity, 'file')
      .where('file.id = :fileId', { fileId: savedFile.id })
      .getOne();
    if (!file) {
      throw new Error('Error saving/retrieving file information.');
    }

    return {
      id: file.id,
      storageId: file.storageId,
      name: file.name,
      description: file.description ?? undefined,
      context: { id: file.contextId, type: file.contextType },
      file: {
        name: file.filename,
        size: file.filesize ?? undefined,
        extension: file.extension
      },
      createdAt: file.createdAt
    };
  }
}
