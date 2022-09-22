import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';
import { InnovationFileEntity } from './innovation-file.entity';

import { ClinicalEvidenceTypeCatalogueEnum, EvidenceTypeCatalogueEnum } from '../../enums/catalog.enums';


@Entity('innovation_evidence')
export class InnovationEvidenceEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'summary', nullable: true })
  summary: string;

  @Column({ name: 'evidence_type', type: 'nvarchar', nullable: true })
  evidenceType: EvidenceTypeCatalogueEnum;

  @Column({ name: 'clinical_evidence_type', type: 'nvarchar', nullable: true })
  clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum;

  @Column({ name: 'description', nullable: true })
  description: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToMany(() => InnovationFileEntity, record => record.evidence, {
    nullable: true,
  })
  @JoinTable({
    name: 'innovation_evidence_file',
    joinColumn: {
      name: 'innovation_evidence_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'innovation_file_id',
      referencedColumnName: 'id'
    },
  })
  files: InnovationFileEntity[];


  static new(data: Partial<InnovationEvidenceEntity>): InnovationEvidenceEntity {
    const instance = new InnovationEvidenceEntity();
    Object.assign(instance, data);
    return instance;
  }

}
