import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationCareSettingCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_care_setting')
export class InnovationCareSettingEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationCareSettingCatalogueEnum, nullable: false })
  type: InnovationCareSettingCatalogueEnum;

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
