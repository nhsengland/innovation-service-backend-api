import { inject, injectable } from 'inversify';
import { EntityManager } from 'typeorm';

import { BaseService } from './base.service';

import { InnovationSurveyEntity, SurveyType } from '@innovations/shared/entities/innovation/innovation-survey.entity';
import { InnovationEntity, UserRoleEntity } from '@innovations/shared/entities';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { DomainService } from '@innovations/shared/services';
import { DomainContextType } from '@innovations/shared/types';

export type SurveyInfoPayload = {
  type: 'SUPPORT_END';
  supportId: string;
  supportUnit: string;
  supportFinishedAt: null | Date;
};

@injectable()
export class SurveysService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService) {
    super();
  }

  /**
   * Method that creates surveys for a innovation.
   * Currently we are assuming that a survey is always for all the Innovators (Owner + Collaborators), if this assumption
   * changes, a `target` should be passed to filter the users.
   */
  async createSurvey(
    type: SurveyType,
    innovationId: string,
    contextId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const targets = await this.domainService.innovations.getInnovationInnovatorsRoleId(innovationId, em);

    await em.save(
      InnovationSurveyEntity,
      targets.map(roleId =>
        InnovationSurveyEntity.new({
          type,
          contextId,
          innovation: InnovationEntity.new({ id: innovationId }),
          targetUserRole: UserRoleEntity.new({ id: roleId })
        })
      )
    );
  }

  /**
   * Method used to get all unanswered surveys for a innovation.
   *
   * It takes into consideration how different types have different payload outputs.
   */
  async getUnansweredSurveys(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ id: string; createdAt: Date; info?: SurveyInfoPayload }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const surveys = await em
      .createQueryBuilder(InnovationSurveyEntity, 'survey')
      .select(['survey.id', 'survey.type', 'survey.createdAt', 'support.id', 'support.finishedAt', 'supportUnit.name'])
      .leftJoin('survey.support', 'support', 'survey.type = :ctxIdIsSupport', {
        ctxIdIsSupport: 'SUPPORT_END'
      })
      .leftJoin('support.organisationUnit', 'supportUnit')
      .where('survey.innovation_id = :innovationId', { innovationId })
      .andWhere('survey.target_user_role_id = :targetRoleId', { targetRoleId: domainContext.currentRole.id })
      .andWhere('survey.answers IS NULL')
      .getMany();

    return surveys.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      // NOTE: If we have more types this should be moved to another function getSurveyInfoPayload() or something.
      ...(s.type === 'SUPPORT_END' &&
        s.support && {
          info: {
            type: s.type,
            supportId: s.support.id,
            supportUnit: s.support.organisationUnit.name,
            supportFinishedAt: s.support.finishedAt
          }
        })
    }));
  }
}
