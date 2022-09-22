import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';
import { InnovationEvidenceEntity } from './innovation-evidence.entity';
import { InnovationSectionEntity } from './innovation-section.entity';


@Entity('innovation_file')
export class InnovationFileEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'context', length: 100, nullable: true })
  context: string;

  @Column({ name: 'display_file_name', length: 100 })
  displayFileName: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToMany(() => InnovationEvidenceEntity, record => record.files)
  evidence: InnovationEvidenceEntity[];

  @ManyToMany(() => InnovationSectionEntity, record => record.files)
  sections: InnovationSectionEntity[];


  static new(data: Partial<InnovationFileEntity>): InnovationFileEntity {
    const instance = new InnovationFileEntity();
    Object.assign(instance, data);
    return instance;
  }

}
