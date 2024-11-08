import { injectable } from 'inversify';
import { Brackets, EntityManager } from 'typeorm';

import { BaseService } from './base.service';

import { InnovationSurveyEntity, SurveyType } from '@innovations/shared/entities/innovation/innovation-survey.entity';
import { InnovationEntity, UserRoleEntity } from '@innovations/shared/entities';
import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';

@injectable()
export class SurveysService extends BaseService {
  constructor() {
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

    const targets = await this.getInnovationInnovatorsRoleId(innovationId, em);

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

  // NOTE: This method could be usefull to be in domain-innovations.
  private async getInnovationInnovatorsRoleId(innovationId: string, entityManager?: EntityManager): Promise<string[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const users = await em
      .createQueryBuilder(UserRoleEntity, 'role')
      .select(['role.id'])
      .innerJoinAndMapOne(
        'innovation',
        InnovationEntity,
        'innovation',
        'innovation.id = :innovationId AND innovation.deleted_at IS NULL',
        { innovationId }
      )
      .leftJoin('innovation.collaborators', 'collaborator', 'collaborator.status = :activeStatus', {
        activeStatus: InnovationCollaboratorStatusEnum.ACTIVE
      })
      .where('role.isActive = 1')
      .andWhere(
        new Brackets(qp => {
          qp.where('role.user_id = innovation.owner_id');
          qp.orWhere('role.user_id = collaborator.user_id');
        })
      )
      .getMany();

    return users.map(r => r.id);
  }
}
