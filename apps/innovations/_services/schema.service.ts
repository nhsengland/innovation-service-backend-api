import { InnovationRecordSchemaEntity } from '@innovations/shared/entities';
import { InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import type { IRSchemaType } from '@innovations/shared/models';
import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class SchemaService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Gets the last schema version.
   * It assumes the current schema is the latest version.
   */
  async getCurrentSchema(entityManager?: EntityManager): Promise<{ version: number; schema: IRSchemaType }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const schema = await em
      .createQueryBuilder(InnovationRecordSchemaEntity, 'schema')
      .orderBy('schema.version', 'DESC')
      .getOne();
    if (!schema) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_RECORD_SCHEMA_NOT_FOUND);
    }

    return { version: schema.version, schema: schema.schema };
  }
}
