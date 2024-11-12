import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationEntity, InnovationSurveyEntity, UserRoleEntity } from '../../entities';
import { BaseBuilder } from './base.builder';
import type { SurveyAnswersType, SurveyType } from '../../entities/innovation/innovation-survey.entity';

export type TestInnovationSurveyType = {
  id: string;
  innovationId: string;
  contextId: string;
  type: SurveyType;
  targetUserRoleId: string;
  answers: null | SurveyAnswersType;
  createdAt: Date;
  updatedAt: Date;
};

export class InnovationSurveyBuilder extends BaseBuilder {
  survey: DeepPartial<InnovationSurveyEntity>;

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.survey = { type: 'SUPPORT_END', answers: null };
  }

  setInnovation(innovationId: string): this {
    this.survey.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  setTypeAndContext(type: SurveyType, contextId: string): this {
    this.survey.type = type;
    this.survey.contextId = contextId;
    return this;
  }

  setAnswers(answers: SurveyAnswersType): this {
    this.survey.answers = answers;
    return this;
  }

  setTarget(roleId: string): this {
    this.survey.targetUserRole = UserRoleEntity.new({ id: roleId });
    return this;
  }

  async save(): Promise<TestInnovationSurveyType> {
    const savedSurvey = await this.getEntityManager().getRepository(InnovationSurveyEntity).save(this.survey);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationSurveyEntity, 'survey')
      .select([
        'survey.id',
        'survey.contextId',
        'survey.type',
        'survey.answers',
        'survey.createdAt',
        'survey.updatedAt',
        'innovation.id',
        'target.id'
      ])
      .innerJoin('survey.innovation', 'innovation')
      .innerJoin('survey.targetUserRole', 'target')
      .where('survey.id = :surveyId', { surveyId: savedSurvey.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving action information.');
    }

    return {
      id: result.id,
      innovationId: result.innovation.id,
      contextId: result.contextId,
      type: result.type,
      answers: result.answers,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      targetUserRoleId: result.targetUserRole.id
    };
  }
}
