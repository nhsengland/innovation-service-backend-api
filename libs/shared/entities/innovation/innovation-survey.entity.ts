import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { UserRoleEntity } from '../user/user-role.entity';
import { InnovationEntity } from './innovation.entity';

type SurveysMapperType = {
  SUPPORT_END: {
    supportSatisfaction: string;
    ideaOnHowToProceed: string;
    howLikelyWouldYouRecommendIS: string;
    comment: string;
  };
};
export type SurveyType = keyof SurveysMapperType;
export type SurveyAnswersType = SurveysMapperType[SurveyType];

@Entity('innovation_survey')
export class InnovationSurveyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 50 })
  type: SurveyType;

  /**
   * Type to ContextId mapping:
   * - SUPPORT_END -> supportId
   */
  @Column({ name: 'context_id', type: 'nvarchar', length: 100 })
  contextId: string;

  // NOTE: If we need to make this general in the feature we can transform this entity into survey and this field to be nullable.
  @ManyToOne(() => InnovationEntity)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @Column({ type: 'simple-json', nullable: true })
  answers: null | SurveyAnswersType;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'target_user_role_id' })
  targetUserRoleId: UserRoleEntity;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', update: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: Date;

  static new(data: Partial<InnovationSurveyEntity>): InnovationSurveyEntity {
    const instance = new InnovationSurveyEntity();
    Object.assign(instance, data);
    return instance;
  }
}
