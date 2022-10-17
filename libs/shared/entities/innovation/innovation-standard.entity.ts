import {  Column,  Entity,  Index,  JoinColumn,  ManyToOne,  PrimaryGeneratedColumn} from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';

import {  InnovationCertificationCatalogueEnum,  StandardMetCatalogueEnum} from '../../enums/catalog.enums';

@Entity('innovation_standard')
@Index(['type', 'innovation'], { unique: true })
export class InnovationStandardEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type', type: 'nvarchar' })
  type: InnovationCertificationCatalogueEnum;

  @Column({ name: 'has_met', type: 'nvarchar' })
  hasMet: StandardMetCatalogueEnum;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationStandardEntity>): InnovationStandardEntity {
    const instance = new InnovationStandardEntity();
    Object.assign(instance, data);
    return instance;
  }

}
