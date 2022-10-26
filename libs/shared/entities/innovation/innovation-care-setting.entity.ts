import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationCareSettingCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_care_setting')
@Index(['type', 'innovation'], { unique: true })
export class InnovationCareSettingEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationCareSettingCatalogueEnum, nullable: false })
  type: InnovationCareSettingCatalogueEnum;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationCareSettingEntity>): InnovationCareSettingEntity {
    const instance = new InnovationCareSettingEntity();
    Object.assign(instance, data);
    return instance;
  }

}
