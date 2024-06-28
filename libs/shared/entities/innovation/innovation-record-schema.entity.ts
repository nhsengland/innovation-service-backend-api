import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';

import type { IRSchemaType } from '../../models/schema-engine/schema.model';

@Entity('innovation_record_schema')
export class InnovationRecordSchemaEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  version: number;

  @Column({ type: 'simple-json' })
  schema: IRSchemaType;

  static new(data: Partial<InnovationRecordSchemaEntity>): InnovationRecordSchemaEntity {
    const instance = new InnovationRecordSchemaEntity();
    Object.assign(instance, data);
    return instance;
  }
}
