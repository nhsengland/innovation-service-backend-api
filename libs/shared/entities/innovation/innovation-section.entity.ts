import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';
import { InnovationActionEntity } from './innovation-action.entity';
import { InnovationFileEntity } from './innovation-file.entity';

import { InnovationSectionEnum, InnovationSectionStatusEnum } from '../../enums/innovation.enums';
import type { DateISOType } from '../../types/date.types';


@Entity('innovation_section')
@Index(['section', 'innovation'], { unique: true })
export class InnovationSectionEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: InnovationSectionEnum,
    nullable: false,
  })
  section: InnovationSectionEnum;

  @Column({
    type: 'simple-enum',
    enum: InnovationSectionStatusEnum,
    nullable: false,
  })
  status: InnovationSectionStatusEnum;

  @Column({ name: 'submitted_at', type: 'datetime2', nullable: true })
  submittedAt: DateISOType;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToMany(() => InnovationFileEntity, record => record.evidence, {
    nullable: true,
  })
  @JoinTable({
    name: 'innovation_section_file',
    joinColumn: {
      name: 'innovation_section_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'innovation_file_id',
      referencedColumnName: 'id'
    },
  })
  files: InnovationFileEntity[];

  @OneToMany(() => InnovationActionEntity, record => record.innovationSection, { lazy: true, cascade: ['insert', 'update'] })
  actions: Promise<InnovationActionEntity[]>;


  static new(data: Partial<InnovationSectionEntity>): InnovationSectionEntity {
    const instance = new InnovationSectionEntity();
    Object.assign(instance, data);
    return instance;
  }

}
