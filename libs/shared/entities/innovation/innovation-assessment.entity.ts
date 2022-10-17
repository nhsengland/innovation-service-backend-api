import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { UserEntity } from '../user/user.entity';
import { InnovationEntity } from './innovation.entity';

import type { MaturityLevelCatalogueEnum, YesPartiallyNoCatalogueEnum } from '../../enums/catalog.enums';
import type { DateISOType } from '../../types/date.types';


@Entity('innovation_assessment')
export class InnovationAssessmentEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: null | string;

  @Column({ name: 'summary', type: 'nvarchar', nullable: true })
  summary: null | string;

  @Column({ name: 'maturity_level', type: 'nvarchar', nullable: true, length: 20 })
  maturityLevel: null | MaturityLevelCatalogueEnum;

  @Column({ name: 'maturity_level_comment', type: 'nvarchar', nullable: true, length: 200 })
  maturityLevelComment: null | string;

  @Column({ name: 'finished_at', type: 'datetime2', nullable: true })
  finishedAt: null | DateISOType;

  @Column({ name: 'has_regulatory_approvals', type: 'nvarchar', nullable: true, length: 20 })
  hasRegulatoryApprovals: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_regulatory_approvals_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasRegulatoryApprovalsComment: null | string;

  @Column({ name: 'has_evidence', type: 'nvarchar', nullable: true, length: 20 })
  hasEvidence: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_evidence_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasEvidenceComment: null | string;

  @Column({ name: 'has_validation', type: 'nvarchar', nullable: true, length: 20 })
  hasValidation: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_validation_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasValidationComment: null | string;

  @Column({ name: 'has_proposition', type: 'nvarchar', nullable: true, length: 20 })
  hasProposition: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_proposition_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasPropositionComment: null | string;

  @Column({ name: 'has_competition_knowledge', type: 'nvarchar', nullable: true, length: 20 })
  hasCompetitionKnowledge: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_competition_knowledge_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasCompetitionKnowledgeComment: null | string;

  @Column({ name: 'has_implementation_plan', type: 'nvarchar', nullable: true, length: 20 })
  hasImplementationPlan: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_implementation_plan_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasImplementationPlanComment: null | string;

  @Column({ name: 'has_scale_resource', type: 'nvarchar', nullable: true, length: 20 })
  hasScaleResource: null | YesPartiallyNoCatalogueEnum;

  @Column({ name: 'has_scale_resource_comment', type: 'nvarchar', nullable: true, length: 200 })
  hasScaleResourceComment: null | string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'assign_to_id' })
  assignTo: UserEntity;

  @ManyToMany(() => OrganisationUnitEntity, record => record.innovationAssessments, { nullable: true })
  @JoinTable({
    name: 'innovation_assessment_organisation_unit',
    joinColumn: {
      name: 'innovation_assessment_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'organisation_unit_id',
      referencedColumnName: 'id'
    },
  })
  organisationUnits: OrganisationUnitEntity[];


  static new(data: Partial<InnovationAssessmentEntity>): InnovationAssessmentEntity {
    const instance = new InnovationAssessmentEntity();
    Object.assign(instance, data);
    return instance;
  }

}
