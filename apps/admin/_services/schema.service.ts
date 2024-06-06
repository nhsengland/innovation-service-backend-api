import { InnovationRecordSchemaEntity } from "@admin/shared/entities";
import type { IRSchemaType } from "@admin/shared/models/schema-engine/schema.model";
import type { DomainContextType } from "@admin/shared/types";
import { injectable } from "inversify";
import type { EntityManager } from "typeorm";
import { BaseService } from "./base.service";

@injectable()
export class SchemaService extends BaseService {
  constructor() {
    super();
  }

  async create(domainContext: DomainContextType, schema: IRSchemaType, entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.save(InnovationRecordSchemaEntity, InnovationRecordSchemaEntity.new({
      schema,
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
    }))
  }
}
