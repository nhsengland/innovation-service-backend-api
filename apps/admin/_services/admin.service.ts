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
  OrganisationTypeEnum,
} from '@admin/shared/enums';
import { NotFoundError, OrganisationErrorsEnum } from '@admin/shared/errors';
import {
  DomainServiceSymbol,
  DomainServiceType,
  NotifierServiceSymbol,
  NotifierServiceType,
} from '@admin/shared/services';
import type { DomainUserInfoType } from '@admin/shared/types';
import { NotificationUserEntity } from '@admin/shared/entities';
import { inject, injectable } from 'inversify';
import { EntityManager, In, UsingJoinTableIsNotAllowedError } from 'typeorm';
import { BaseService } from './base.service';
import { AuthErrorsEnum } from '@admin/shared/services/auth/authorization-validation.model';

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
    
    // get all supports from unit
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

    const supportsToComplete = supports.filter(s => 
      [
        InnovationSupportStatusEnum.ENGAGING,
        InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED
      ].includes(s.status));

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
      const updatedSupports = supportsToComplete.map((support) => ({
        ...support,
        status: InnovationSupportStatusEnum.COMPLETE,
        organisationUnitUsers: [],
      }));

      console.log('updated supports', updatedSupports)

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

  async createOrganisation(
    requestUser: DomainServiceType,
    organisation: {
      name: string;
      acronym: string;
      units?: { name: string; acronym: string }[];
    }
  ): Promise<{ id: string }> {

    const name = organisation.name
    const acronym = organisation.acronym

    const orgAlreadyExists = await this.sqlConnection
      .createQueryBuilder(OrganisationEntity, 'org')
      .where('org.name = :name OR organisation.acronym = :acronym', { name, acronym })
      .getOne()

    if (orgAlreadyExists) {
      throw new Error(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS)
    }

    const org = OrganisationEntity.new({
      name,
      acronym,
      inactivatedAt: new Date(),
      type: OrganisationTypeEnum.ACCESSOR,
      isShadow: false 
    });

    const result = await this.sqlConnection.transaction(async (transaction) => {

      const savedOrganisation = await transaction.save(
        OrganisationEntity,
        org
      );

      /*
        units can only have length 0 or greater than 1
        if 0 -> create shadow unit
        if > 1 -> create specified units and shadow
      */
      if (organisation.units && organisation.units.length > 1) {
        //create specified units
        for (const unit of organisation.units) {
          try {
            const u = await this.createOrganisationUnit(
              org.id,
              unit.name,
              unit.acronym,
              false,
              transaction
            )
          }
          catch (error) {
            throw error;
          }
        }
      }
      //create shadow unit
      try {
        const u = await this.createOrganisationUnit(
          org.id,
          name,
          acronym,
          true,
          transaction
        )
      }
      catch (error) {
        throw error
      }

      return { id: savedOrganisation.id }
    });

    return result
  }

  private async createOrganisationUnit(
    organisationId: string,
    name: string,
    acronym: string,
    isShadow: boolean,
    transaction: EntityManager
  ): Promise<OrganisationUnitEntity> {

    const org = await this.sqlConnection
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .where('organanisation.id = :organisationId', { organisationId })
      .getOne()

    if (!org) {
      throw new Error(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND)
    }

    const unitAlreadyExists = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.name = :name OR unit.acronym = :acronym', { name, acronym })
      .getOne()

    if (unitAlreadyExists) {
      throw new Error(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS)
    }

    const savedUnit = await transaction.save(
      OrganisationUnitEntity,
      OrganisationUnitEntity.new({
        name: name,
        acronym: acronym,
        inactivatedAt: new Date(),
        isShadow: isShadow,
        organisation: org
      })
    );
    
    return savedUnit
  }
}
