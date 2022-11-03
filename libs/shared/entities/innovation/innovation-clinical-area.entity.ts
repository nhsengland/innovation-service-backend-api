import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { InnovationClinicalAreaCatalogueEnum } from '../../enums/catalog.enums';


/**
 * @deprecated entity.
 * This entity is not being used by anywhere anymore.
 */
@Entity('innovation_clinical_area')
export class InnovationClinicalAreaEntity extends BaseEntity {

  @PrimaryColumn({ type: 'simple-enum', enum: InnovationClinicalAreaCatalogueEnum, nullable: false })
  type: InnovationClinicalAreaCatalogueEnum;


  @PrimaryColumn({ type: 'uniqueidentifier', name: 'innovation_id' })
  innovationId: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationClinicalAreaEntity>): InnovationClinicalAreaEntity {
    const instance = new InnovationClinicalAreaEntity();
    Object.assign(instance, data);
    return instance;
  }

}
