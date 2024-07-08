import { inject, injectable } from 'inversify';
import { IRSchemaType, SchemaModel } from '../../models/schema-engine/schema.model';
import type { DataSource } from 'typeorm';
import SHARED_SYMBOLS from '../symbols';
import type { SQLConnectionService } from './sql-connection.service';
import { InnovationRecordSchemaEntity } from '../../entities/innovation/innovation-record-schema.entity';
import { BadRequestError, GenericErrorsEnum, InnovationErrorsEnum, NotFoundError } from '../../errors';
import type Joi from 'joi';

type Schema = {
  version: number;
  schema: IRSchemaType;
};

@injectable()
export class IRSchemaService {
  private schema: Schema | null = null;
  private model: SchemaModel | null = null;
  private sqlConnection: DataSource;

  constructor(
    @inject(SHARED_SYMBOLS.SQLConnectionService) private readonly sqlConnectionService: SQLConnectionService
  ) {
    this.sqlConnection = this.sqlConnectionService.getConnection();
  }

  /**
   * This method orchestrates the schema getter. Loads from DB if it doesn't exist,
   * otherwise returns the one in memory.
   */
  async getSchema(reload?: boolean): Promise<Schema> {
    if (!this.schema || reload) {
      this.schema = await this.getSchemaVersion();
      if (this.schema?.schema) {
        this.model = this.createModelAndValidate(this.schema?.schema);
      }
    }
    if (!this.schema) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_RECORD_SCHEMA_NOT_FOUND);
    }
    return this.schema;
  }

  /**
   * Returns the dynamic validation for a specific section based on the payload sent.
   */
  getPayloadValidation(subSectionId: string, payload: { [key: string]: any }): Joi.ObjectSchema {
    if (!this.model) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_RECORD_SCHEMA_NOT_FOUND);
    }
    return this.model.getSubSectionPayloadValidation(subSectionId, payload);
  }

  /**
   * Orchestrate the update of a schema, this includes validating the schema,
   * creating a new schema in the DB, and lastly update the in-memory schema and model.
   */
  async updateSchema(newSchema: IRSchemaType, updatedBy: string) {
    this.model = this.createModelAndValidate(newSchema);
    if (this.model.schema) {
      await this.sqlConnection.manager.save(
        InnovationRecordSchemaEntity,
        InnovationRecordSchemaEntity.new({ schema: this.model.schema, createdBy: updatedBy, updatedBy })
      );
      this.schema = null;
      await this.getSchema(true);
    }
  }

  isSubsectionValid(subSectionId: string): boolean {
    return this.model?.isSubsectionValid(subSectionId) ?? false;
  }

  /**
   * This method is responsible for getting from the DB the schema version.
   */
  private async getSchemaVersion(version?: number): Promise<Schema | null> {
    const query = this.sqlConnection
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
