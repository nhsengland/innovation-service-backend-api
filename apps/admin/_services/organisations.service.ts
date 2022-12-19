import { InnovationActionEntity, InnovationSupportEntity, NotificationEntity, OrganisationEntity, OrganisationUnitEntity, OrganisationUnitUserEntity, UserEntity } from '@admin/shared/entities';
import { AccessorOrganisationRoleEnum, InnovationActionStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, NotifierTypeEnum, OrganisationTypeEnum } from '@admin/shared/enums';
import { NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@admin/shared/services';
import type { DomainUserInfoType } from '@admin/shared/types';
import { NotificationUserEntity } from '@admin/shared/entities';
import { inject, injectable } from 'inversify';
import { EntityManager, In } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class OrganisationsService extends BaseService {
  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) {
    super();
  }


  async inactivateUnit(requestUser: DomainUserInfoType, unitId: string): Promise<{ unitId: string }> {

    // get the organisation to whom the unit belongs to
    const unit = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'org_units')
      .where('org_units.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    // get users from unit
    const usersToLock = (
      await this.sqlConnection
        .createQueryBuilder(OrganisationUnitUserEntity, 'org_unit_user')
        .leftJoinAndSelect('org_unit_user.organisationUser', 'org_user')
        .leftJoinAndSelect('org_user.user', 'user')
        .where('org_unit_user.organisation_unit_id = :unitId', { unitId })
        .getMany()
    ).map(u => ({ id: u.organisationUser.user.id, identityId: u.organisationUser.user.identityId }))


    // only want to clear actions with these statuses
    const actionStatusToClear = [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.IN_REVIEW]

    //get id of actions to clear issued by the unit users
    const actionsToClear = (
      await this.sqlConnection
        .createQueryBuilder(InnovationActionEntity, 'action')
        .leftJoinAndSelect('action.innovationSupport', 'support')
        .leftJoinAndSelect('support.organisationUnit', 'unit')
        .where('unit.id = :unitId', { unitId })
        .andWhere('action.status IN (:...actionStatusToClear)', { actionStatusToClear })
        .getMany()
    ).map(a => a.id)

    //only want to complete the support of innovations with these statuses
    const supportStatusToComplete = [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED]

    //get supports to complete
    const supportsToComplete = await this.sqlConnection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .leftJoinAndSelect('support.organisationUnit', 'unit')
      .leftJoinAndSelect('support.innovation', 'innovation')
      .leftJoinAndSelect('support.organisationUnitUsers', 'assignedUsers')
      .where('unit.id = :unitId', { unitId })
      .andWhere('support.status IN (:...supportStatusToComplete)', { supportStatusToComplete })
      .getMany()

    const contexts = [...actionsToClear, ...(supportsToComplete.map(s => s.id))];

    let notificationsToMarkAsRead: NotificationEntity[] = [];

    if (contexts.length > 0) {
      notificationsToMarkAsRead = await this.sqlConnection
        .createQueryBuilder(NotificationEntity, 'notification')
        .innerJoinAndSelect('notification.notificationUsers', 'notificationUser')
        .where('notification.context_id IN (:...contexts)', { contexts })
        .andWhere('notificationUser.read_at IS NULL')
        .getMany();
    }

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
      if (supportsToComplete.length > 0) {
        await transaction.update(
          InnovationSupportEntity,
          { id: In(supportsToComplete.map(s => s.id)) },
          {
            status: InnovationSupportStatusEnum.COMPLETE,
            organisationUnitUsers: []
          }
        )
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

      for (const support of supportsToComplete) {
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
      return { unitId };
    });

    // lock users in identity provider asynchronously
    // using idendity-ops-queue
    if (usersToLock.length > 0) {
      for (const user of usersToLock) {
        await this.identityProviderService.updateUserAsync(
          user.identityId,
          { accountEnabled: false }
        )
      }
    }
    return result;
  }


  async activateUnit(organisationId: string, unitId: string, userIds: string[]): Promise<{ unitId: string }> {

    const unit = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
      .innerJoinAndSelect('org_unit.organisation', 'organisation')
      .where('org_unit.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(
        OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND
      );
    }

    // get users entities
    const usersToUnlock = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.userOrganisations', 'org_user')
      .innerJoin('org_user.userOrganisationUnits', 'unit_user')
      .where('unit_user.id IN (:...userIds)', { userIds })
      .andWhere('unit_user.organisationUnit.id = :unitId', { unitId }) //ensure users to unlock belong to unit
      .getMany();

    // get organisationUnitUser entities
    const unitUsers = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitUserEntity, 'org_unit_user')
      .innerJoinAndSelect('org_unit_user.organisationUser', 'org_user')
      .where('org_unit_user.organisation_unit_id = :unitId', { unitId })
      .getMany();

    //check if at least 1 user is QA
    const canActivate = unitUsers.some(u => u.organisationUser.role === AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR);

    if (!canActivate) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ACTIVATE_NO_QA);
    }

    const result = await this.sqlConnection.transaction(async (transaction) => {
      // Activate unit
      await transaction.update(
        OrganisationUnitEntity,
        { id: unitId },
        { inactivatedAt: null }
      );

      // activate organistion to whom unit belongs if it is inactivated
      if (unit.organisation.inactivatedAt !== null) {
        await transaction.update(
          OrganisationEntity,
          { id: organisationId },
          { inactivatedAt: null }
        );
      }

      //Activate users of unit
      for (const u of usersToUnlock) {
        await transaction.update(UserEntity, { id: u.id }, { lockedAt: null });
      }
      return { unitId };
    });

    // unlock users in identity provider asynchronously
    // using identity-ops-queue
    for (const user of usersToUnlock) {
      await this.identityProviderService.updateUserAsync(
        user.identityId,
        { accountEnabled: true }
      )
    }

    return result;
  }


  async updateUnit(
    unitId: string,
    name: string,
    acronym: string
  ): Promise<{
    id: string;
  }> {
    return this.sqlConnection.transaction(async (transaction) => {
      const unit = await transaction
        .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
        .where('org_unit.id = :unitId', { unitId })
        .getOne();

      if (!unit) {
        throw new NotFoundError(
          OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND
        );
      }

      const unitNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
        .where(
          '(org_unit.name = :name OR org_unit.acronym = :acronym) AND (org_unit.id != :unitId)',
          { name, acronym, unitId }
        )
        .getOne();

      if (unitNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(
          OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS
        );
      }

      await transaction.update(
        OrganisationUnitEntity,
        { id: unit.id },
        {
          name: name,
          acronym: acronym,
        }
      );

      return { id: unit.id };
    });
  }


  async updateOrganisation(
    organisationId: string,
    name: string,
    acronym: string
  ): Promise<{
    id: string;
  }> {
    return this.sqlConnection.transaction(async (transaction) => {
      const organisation = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .innerJoinAndSelect('org.organisationUnits', 'organisationUnits')
        .where('org.id = :organisationId', { organisationId })
        .getOne();

      if (!organisation) {
        throw new NotFoundError(
          OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND
        );
      }

      const orgNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .where(
          '(org.name = :name OR org.acronym = :acronym) AND (org.id != :organisationId)',
          { name, acronym, organisationId }
        )
        .getOne();

      if (orgNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(
          OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS
        );
      }

      await transaction.update(
        OrganisationEntity,
        { id: organisation.id },
        {
          name: name,
          acronym: acronym,
        }
      );

      if ((await organisation.organisationUnits).length == 1) {
        // if organisation only has one unit (shadow), the name and acronym
        // of this unit must also be changed

        const unitIds = (await organisation.organisationUnits).map((u) => u.id);

        await transaction.update(
          OrganisationUnitEntity,
          { id: unitIds[0] },
          {
            name: name,
            acronym: acronym,
          }
        );
      }

      return { id: organisation.id };
    });
  }

  async createOrganisation(
    name: string,
    acronym: string,
    units?: { name: string; acronym: string }[]
  ): Promise<{
    id: string;
    units: string[];
  }> {

    const result = await this.sqlConnection.transaction(async (transaction) => {
      const orgNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .where('org.name = :name OR org.acronym = :acronym', { name, acronym })
        .getOne();

      if (orgNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(
          OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS
        );
      }

      const org = OrganisationEntity.new({
        name,
        acronym,
        inactivatedAt: new Date().toISOString(),
        type: OrganisationTypeEnum.ACCESSOR,
        isShadow: false,
      });

      const savedOrganisation = await transaction.save(OrganisationEntity, org);

      /*
          units can only have length 0 or greater than 1
          if 0 -> create shadow unit
          if > 1 -> create specified units
        */
      const savedUnits: OrganisationUnitEntity[] = [];
      if (units && units.length > 1) {
        //create specified units
        for (const unit of units) {
          const u = await this.createOrganisationUnit(
            savedOrganisation.id,
            unit.name,
            unit.acronym,
            false,
            transaction
          );
          savedUnits.push(u);
        }
        return { id: savedOrganisation.id, units: savedUnits };
      }
      //create shadow unit
      const shadowUnit = await this.createOrganisationUnit(
        org.id,
        name,
        acronym,
        true,
        transaction
      );
      savedUnits.push(shadowUnit);

      return { id: savedOrganisation.id, units: savedUnits };
    });

    return { id: result.id, units: result.units.map((u) => u.id) };
  }

<<<<<<< HEAD
  async createUnit(
    organisationId: string,
    name: string,
    acronym: string
  ): Promise<{ id: string }> {

    const unit = await this.sqlConnection.transaction(async transaction => {
      
      return this.createOrganisationUnit(organisationId, name, acronym, false, transaction)

    });

    return { id: unit.id }
  }
=======
>>>>>>> 2945fb5293c3d20cf3ba58be45c4d8e7d2cfbe8c

  private async createOrganisationUnit(
    organisationId: string,
    name: string,
    acronym: string,
    isShadow: boolean,
    transaction: EntityManager
  ): Promise<OrganisationUnitEntity> {
    const org = await transaction
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .where('organisation.id = :organisationId', { organisationId })
      .getOne();

    if (!org) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    const unitNameOrAcronymAlreadyExists = await transaction
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.name = :name OR unit.acronym = :acronym', { name, acronym })
      .getOne();

    if (unitNameOrAcronymAlreadyExists) {
      throw new UnprocessableEntityError(
        OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS
      );
    }

    const savedUnit = await transaction.save(
      OrganisationUnitEntity,
      OrganisationUnitEntity.new({
        name: name,
        acronym: acronym,
        inactivatedAt: new Date().toISOString(),
        isShadow: isShadow,
        organisation: org,
      })
    );

    return savedUnit;
  }

  
}
