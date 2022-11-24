import {
  InnovationActionEntity,
  InnovationSupportEntity,
  NotificationEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
} from '@admin/shared/entities';
import { InnovationActionStatusEnum, InnovationSupportStatusEnum } from '@admin/shared/enums';
import type { DomainUserInfoType } from '@admin/shared/types';
import type { HttpRequestUser } from '@azure/functions';
import { UnprocessableEntityError } from '@innovations/shared/errors';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class AdminService extends BaseService {
  constructor() {}

  async inactivateUnit(
    requestUser: DomainUserInfoType,
    unitId: string
  ): Promise<{ id: string }> {
    
    // // get users from unit
    // const users = await this.sqlConnection
    //   .createQueryBuilder(OrganisationUnitUserEntity, 'org_unit_user')
    //   .leftJoinAndSelect('org_unit_user.organisationUser', 'org_user')
    //   .leftJoinAndSelect('org_user.user', 'user')
    //   .where('org_unit_user.organisation_unit_id = :unitId', {
    //     unitId,
    //   })
    //   .getMany();

    // //get open actions issued by users from unit
    // const actions = await this.sqlConnection
    //   .createQueryBuilder(InnovationActionEntity, 'actions')
    //   .leftJoinAndSelect('actions.innovationSupport', 'supports')
    //   .leftJoinAndSelect('supports.organisationUnit', 'unit')
    //   .where('unit.id = :unitId', { unitId })
    //   .getMany();

    // // get innovations with active support from unit
    // const supports = await this.sqlConnection
    //   .createQueryBuilder(InnovationSupportEntity, 'support')
    //   .leftJoinAndSelect('support.organisationUnit', 'unit')
    //   .leftJoinAndSelect('support.innovation', 'innovation')
    //   .leftJoinAndSelect('support.organisationUnitUsers', 'assignedUsers')
    //   .where('unit.id = :unitId', { unitId })
    //   .getMany();

    // const usersToLock = users.map((u) => ({
    //   id: u.organisationUser.user.id,
    // }));

    // const actionIds = actions.map((a) => a.id);
    // const supportIds = supports.map((s) => s.id);

    // // TODO: clear and lock stuff

    // const contexts = [...actionIds, ...supportIds];

    // if (contexts.length > 0) {
    //   const notificationsToMarkAsRead = await this.sqlConnection
    //     .createQueryBuilder(NotificationEntity, 'notification')
    //     .innerJoinAndSelect('notification.notificationUsers', 'notificationUser')
    //     .where('notification.context_id IN (:..contexts)', {contexts})
    //     .andWhere('notificationUser.read_at IS NULL')
    //     .getMany();
    // }


    const result = await this.sqlConnection.transaction(async transaction => {

      const actionsToClear = actions.filter(a => 
        [
          InnovationActionStatusEnum.REQUESTED,
          InnovationActionStatusEnum.IN_REVIEW
        ].includes(a.status)
      ).map(aa => aa.id);

    
    const supportsToComplete = supports.filter(s => {
      [
        InnovationSupportStatusEnum.ENGAGING,
        InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED
      ].includes(s.status)
    });

    //Inactivate unit
    const inactivateUnitResult = await transaction.update(
      OrganisationUnitEntity,
      {id: unitId},
      {inactivatedAt: new Date().toISOString()}
    );
    
    

  });

  }
}