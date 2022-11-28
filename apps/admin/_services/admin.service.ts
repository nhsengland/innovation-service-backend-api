import {
  InnovationActionEntity,
  InnovationSupportEntity,
  NotificationEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
  UserEntity,
} from '@admin/shared/entities';
import {
  InnovationActionStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  NotifierTypeEnum,
} from '@admin/shared/enums';
import { NotFoundError, OrganisationErrorsEnum } from '@admin/shared/errors';
import {
  DomainServiceSymbol,
  DomainServiceType,
  NotifierServiceSymbol,
  NotifierServiceType,
} from '@admin/shared/services';
import type { DomainUserInfoType } from '@admin/shared/types';
import { NotificationUserEntity } from '@innovations/shared/entities';
import { inject, injectable } from 'inversify';
import { In } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class AdminService extends BaseService {
  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) {
    super();
  }

  async inactivateUnit(
    requestUser: DomainUserInfoType,
    unitId: string
  ): Promise<{ id: string }> {
    // get the organisation to whom the unit belongs to
    const unit = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'org_units')
      .where('org_units.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(
        OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND
      );
    }

    // get users from unit
    const users = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitUserEntity, 'org_unit_user')
      .leftJoinAndSelect('org_unit_user.organisationUser', 'org_user')
      .leftJoinAndSelect('org_user.user', 'user')
      .where('org_unit_user.organisation_unit_id = :unitId', {
        unitId,
      })
      .getMany();
    
    //get open actions issued by users from unit
    const actions = await this.sqlConnection
      .createQueryBuilder(InnovationActionEntity, 'actions')
      .leftJoinAndSelect('actions.innovationSupport', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'unit')
      .where('unit.id = :unitId', { unitId })
      .getMany();
    
    // get innovations with active support from unit
    const supports = await this.sqlConnection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .leftJoinAndSelect('support.organisationUnit', 'unit')
      .leftJoinAndSelect('support.innovation', 'innovation')
      .leftJoinAndSelect('support.organisationUnitUsers', 'assignedUsers')
      .where('unit.id = :unitId', { unitId })
      .getMany();

    const usersToLock = users.map((u) => ({
      id: u.organisationUser.user.id,
    }));

    const actionIds = actions.map((a) => a.id);
    const supportIds = supports.map((s) => s.id);

    const contexts = [...actionIds, ...supportIds];

    let notificationsToMarkAsRead: NotificationEntity[] = [];

    if (contexts.length > 0) {
      notificationsToMarkAsRead = await this.sqlConnection
        .createQueryBuilder(NotificationEntity, 'notification')
        .innerJoinAndSelect(
          'notification.notificationUsers',
          'notificationUser'
        )
        .where('notification.context_id IN (:...contexts)', { contexts })
        .andWhere('notificationUser.read_at IS NULL')
        .getMany();
    }

    const actionsToClear = actions
      .filter((a) =>
        [
          InnovationActionStatusEnum.REQUESTED,
          InnovationActionStatusEnum.IN_REVIEW,
        ].includes(a.status)
      )
      .map((aa) => aa.id);

    const supportsToComplete = supports.filter((s) => {
      [
        InnovationSupportStatusEnum.ENGAGING,
        InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED,
      ].includes(s.status);
    });

    const result = await this.sqlConnection.transaction(async (transaction) => {
      // Inactivate unit
      await transaction.update(
        OrganisationUnitEntity,
        { id: unitId },
        { inactivatedAt: new Date().toISOString() }
      );

      // Clear actions issued by unit
      if (actionsToClear.length > 0) {
        await transaction.update(
          InnovationActionEntity,
          { id: In(actionsToClear) },
          { status: InnovationActionStatusEnum.DELETED }
        );
      }

      // Complete supports of unit
      // Check with Antonio why we don't use update here
      const updatedSupports = supportsToComplete.map((support) => ({
        ...support,
        status: InnovationSupportStatusEnum.COMPLETE,
        organisationUnitUsers: [],
      }));

      if (updatedSupports.length > 0) {
        await transaction
          .getRepository(InnovationSupportEntity)
          .save(updatedSupports, { chunk: 50 });
      }

      // Mark as read notifications in the context of this unit
      if (notificationsToMarkAsRead.length > 0) {
        await transaction.update(
          NotificationUserEntity,
          { notification: In(notificationsToMarkAsRead.map((n) => n.id)) },
          { readAt: new Date().toISOString() }
        );
      }

      // lock users of unit
      if (usersToLock.length > 0) {
        await transaction.update(
          UserEntity,
          { id: In(usersToLock.map((u) => u.id)) },
          { lockedAt: new Date().toISOString() }
        );
      }

      const organisationId = unit.organisationId;

      // get number of active units in organisation
      const activeUnitsCounter = await transaction
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.inactivatedAt IS NULL')
        .andWhere('unit.organisation_id = :organisationId', { organisationId })
        .getCount();

      // inactivate organisation if it has no active units
      if (activeUnitsCounter === 0) {
        await transaction.update(
          OrganisationEntity,
          { id: organisationId },
          { inactivatedAt: new Date().toISOString() }
        );
      }

      for (const support of updatedSupports) {
        await this.domainService.innovations.addSupportLog(
          transaction,
          { id: requestUser.id, organisationUnitId: unitId },
          { id: support.innovation.id },
          support.status,
          {
            type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
            description: '',
            suggestedOrganisationUnits: [],
          }
        );

        await this.notifierService.send<NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED>(
          {
            id: requestUser.id,
            identityId: requestUser.identityId,
            type: requestUser.type,
          },
          NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
          {
            innovationId: support.innovation.id,
            unitId,
          }
        );
      }

      return { id: unitId };
    });

    return result;
  }
}
