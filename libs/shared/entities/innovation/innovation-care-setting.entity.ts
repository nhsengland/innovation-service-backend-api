import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { catalogCareSettings } from '../../schemas/innovation-record/202209/catalog.types';
import { InnovationEntity } from './innovation.entity';

/**
 * @deprecated to be removed with InnovationEntity changes
 */
@Entity('innovation_care_setting')
export class InnovationCareSettingEntity extends BaseEntity {
  @PrimaryColumn({ type: 'simple-enum', enum: catalogCareSettings, nullable: false })
  type: catalogCareSettings;

  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: Partial<InnovationCareSettingEntity>): InnovationCareSettingEntity {
    const instance = new InnovationCareSettingEntity();
    Object.assign(instance, data);
    return instance;
  }
}
