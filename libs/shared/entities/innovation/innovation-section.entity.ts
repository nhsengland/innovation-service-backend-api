import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationActionEntity } from './innovation-action.entity';
import { InnovationFileEntity } from './innovation-file.entity';
import { InnovationEntity } from './innovation.entity';

import { CurrentCatalogTypes } from '../../../shared/schemas/innovation-record';
import { InnovationSectionStatusEnum } from '../../enums/innovation.enums';

import { UserEntity } from '../user/user.entity';

@Entity('innovation_section')
@Index(['section', 'innovation'], { unique: true })
export class InnovationSectionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: CurrentCatalogTypes.InnovationSections, nullable: false })
  section: CurrentCatalogTypes.InnovationSections;

  @Column({ type: 'simple-enum', enum: InnovationSectionStatusEnum, nullable: false })
  status: InnovationSectionStatusEnum;

  @Column({ name: 'submitted_at', type: 'datetime2', nullable: true })
  submittedAt: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'submitted_by' })
  submittedBy: UserEntity | null;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToMany(() => InnovationFileEntity, record => record.evidence, { nullable: true })
  @JoinTable({
    name: 'innovation_section_file',
    joinColumn: { name: 'innovation_section_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'innovation_file_id', referencedColumnName: 'id' }
  })
  files: InnovationFileEntity[];

  @OneToMany(() => InnovationActionEntity, record => record.innovationSection, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  actions: Promise<InnovationActionEntity[]>;

  static new(data: Partial<InnovationSectionEntity>): InnovationSectionEntity {
    const instance = new InnovationSectionEntity();
    Object.assign(instance, data);
    return instance;
  }
}
