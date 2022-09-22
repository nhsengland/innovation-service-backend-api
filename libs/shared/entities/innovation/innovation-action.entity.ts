import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationSectionEntity } from './innovation-section.entity';
import { InnovationSupportEntity } from './innovation-support.entity';

import { InnovationActionStatusEnum } from '../../enums/innovation.enums';


@Entity('innovation_action')
export class InnovationActionEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column({ name: 'display_id', length: 5 })
  displayId: string;

  @Column({ type: 'simple-enum', enum: InnovationActionStatusEnum, nullable: false })
  status: InnovationActionStatusEnum;


  @ManyToOne(() => InnovationSectionEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_section_id' })
  innovationSection: InnovationSectionEntity;

  @ManyToOne(() => InnovationSupportEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_support_id' })
  innovationSupport: InnovationSupportEntity;


  static new(data: Partial<InnovationActionEntity>): InnovationActionEntity {
    const instance = new InnovationActionEntity();
    Object.assign(instance, data);
    return instance;
  }

}
