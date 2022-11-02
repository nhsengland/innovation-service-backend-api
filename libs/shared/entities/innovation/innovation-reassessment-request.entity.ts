import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationAssessmentEntity } from './innovation-assessment.entity';
import { InnovationEntity } from './innovation.entity';


@Entity('innovation_reassessment_request')
export class InnovationReassessmentRequestEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'updated_innovation_record', type: 'varchar', nullable: true, length: 3 })
  updatedInnovationRecord: string;

  @Column({ name: 'changes', type: 'nvarchar', nullable: false, length: 200 })
  changes: string;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @OneToOne(() => InnovationAssessmentEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_assessment_id' })
  assessment: InnovationAssessmentEntity;


  static new(data: Partial<InnovationReassessmentRequestEntity>): InnovationReassessmentRequestEntity {
    const instance = new InnovationReassessmentRequestEntity();
    Object.assign(instance, data);
    return instance;
  }

}
