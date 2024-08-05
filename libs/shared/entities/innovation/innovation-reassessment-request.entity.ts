import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { YesOrNoCatalogueType } from '../../../shared/enums';
import { InnovationAssessmentEntity } from './innovation-assessment.entity';
import { InnovationEntity } from './innovation.entity';
@Entity('innovation_reassessment_request')
export class InnovationReassessmentRequestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'updated_innovation_record', type: 'varchar', nullable: true, length: 3 })
  updatedInnovationRecord: YesOrNoCatalogueType | null;

  @Column({ name: 'description', type: 'nvarchar' })
  description: string;

  @Column({ name: 'reassessment_reason', type: 'simple-array', nullable: true })
  reassessmentReason: string[] | null;

  @Column({ name: 'other_reassessment_reason', type: 'nvarchar', nullable: true })
  otherReassessmentReason: string | null;

  @Column({ name: 'what_support_do_you_need', type: 'nvarchar', nullable: true })
  whatSupportDoYouNeed: string | null;

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
