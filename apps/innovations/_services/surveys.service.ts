import { inject, injectable } from 'inversify';
import { EntityManager } from 'typeorm';

import { BaseService } from './base.service';

import { InnovationSurveyEntity, SurveyType } from '@innovations/shared/entities/innovation/innovation-survey.entity';
import { InnovationEntity, UserRoleEntity } from '@innovations/shared/entities';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { DomainService } from '@innovations/shared/services';

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
          targetUserRoleId: UserRoleEntity.new({ id: roleId })
        })
      )
    );
  }
}
