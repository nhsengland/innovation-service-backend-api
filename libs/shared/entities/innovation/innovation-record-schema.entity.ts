import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';

import type { IRSchemaType } from '../../models/schema-engine/schema.model';

@Entity('innovation_record_schema')
export class InnovationRecordSchemaEntity extends BaseEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string;

  @Column({ type: 'simple-json' })
  schema: IRSchemaType;

  @Column({ type: 'int', generated: true })
  version: number;

  static new(data: Partial<InnovationRecordSchemaEntity>): InnovationRecordSchemaEntity {
    const instance = new InnovationRecordSchemaEntity();
    Object.assign(instance, data);
    return instance;
  }
}
