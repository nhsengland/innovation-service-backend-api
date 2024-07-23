import { inject, injectable } from 'inversify';
import { IRSchemaType, SchemaModel } from '../../models/schema-engine/schema.model';
import SHARED_SYMBOLS from '../symbols';
import type { SQLConnectionService } from './sql-connection.service';
import { InnovationRecordSchemaEntity } from '../../entities/innovation/innovation-record-schema.entity';
import { BadRequestError, GenericErrorsEnum, InnovationErrorsEnum, NotFoundError } from '../../errors';
import type { CacheConfigType, CacheService } from './cache.service';

type Schema = { version: number; model: SchemaModel };

const LATEST_VERSION = 'latest_version';

@injectable()
export class IRSchemaService {
  private version: number | null = null;
  private model: SchemaModel | null = null;
  private cache: CacheConfigType['IrSchema'];

  constructor(
    @inject(SHARED_SYMBOLS.SQLConnectionService) private readonly sqlConnectionService: SQLConnectionService,
    @inject(SHARED_SYMBOLS.CacheService) private readonly cacheService: CacheService
  ) {
    this.cache = this.cacheService.get('IrSchema');
  }

  /**
   * This method orchestrates the schema getter. Loads from DB if it doesn't exist,
   * otherwise returns the one in memory.
   */
  async getSchema(): Promise<Schema> {
    if ((await this.cache.get(LATEST_VERSION)) !== this?.version) {
      await this.reSyncIrSchema();
    }
    if (!this.model || this.version === null) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_RECORD_SCHEMA_NOT_FOUND);
    }
    return { version: this.version, model: this.model };
  }

  /**
   * Orchestrate the update of a schema, this includes validating the schema,
   * creating a new schema in the DB, and lastly update the in-memory schema and model.
   */
  async updateSchema(newSchema: IRSchemaType, updatedBy: string) {
    this.model = this.createModelAndValidate(newSchema);
    if (this.model.schema) {
      const { version } = await this.sqlConnectionService
        .getConnection()
        .manager.save(
          InnovationRecordSchemaEntity,
          InnovationRecordSchemaEntity.new({ schema: this.model.schema, createdBy: updatedBy, updatedBy })
        );
      this.cache.set(LATEST_VERSION, version);
    }
  }

  private async reSyncIrSchema(): Promise<void> {
    const dbSchema = await this.getSchemaVersion();
    if (!dbSchema) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_RECORD_SCHEMA_NOT_FOUND);
    }
    this.cache.set(LATEST_VERSION, dbSchema.version);
    this.model = this.createModelAndValidate(dbSchema.schema);
    this.version = dbSchema.version;
  }

  /**
   * This method is responsible for getting from the DB the schema version.
   */
  private async getSchemaVersion(version?: number): Promise<{ version: number; schema: IRSchemaType } | null> {
    const query = this.sqlConnectionService
      .getConnection()
      .createQueryBuilder(InnovationRecordSchemaEntity, 'schema')
      .orderBy('schema.version', 'DESC');
    if (version) {
      query.andWhere('schema.version = :version', { version });
    }

    const schema = await query.getOne();
    return schema ? { version: schema.version, schema: schema.schema } : null;
  }

  private createModelAndValidate(newSchema: IRSchemaType): SchemaModel {
    const schemaModel = new SchemaModel(newSchema);
    const { schema, errors } = schemaModel.runRules();

    if (errors.length > 0 || !schema) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { details: errors });
    }

    return schemaModel;
  }
}
