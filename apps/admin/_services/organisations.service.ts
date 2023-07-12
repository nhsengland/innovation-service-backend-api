import { inject, injectable } from 'inversify';
import { EntityManager, In, IsNull } from 'typeorm';

import {
  InnovationActionEntity,
  InnovationSupportEntity,
  NotificationEntity,
  NotificationUserEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
  OrganisationUserEntity,
  UserEntity,
  UserRoleEntity
} from '@admin/shared/entities';
import {
  InnovationActionStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  NotifierTypeEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@admin/shared/enums';
import { ConflictError, NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';
import { DatesHelper, ValidationsHelper } from '@admin/shared/helpers';
import { UrlModel } from '@admin/shared/models';
import type { DomainService, IdentityProviderService, NotifierService } from '@admin/shared/services';
import type { DomainContextType, DomainUserInfoType } from '@admin/shared/types';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { ENV } from '../_config';
import type { AnnouncementsService } from './announcements.service';
import { BaseService } from './base.service';
import SYMBOLS from './symbols';

@injectable()
export class OrganisationsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SYMBOLS.AnnouncementsService) private announcementsService: AnnouncementsService
  ) {
    super();
  }

  async inactivateUnit(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    unitId: string
  ): Promise<{ unitId: string }> {
    // get the organisation to whom the unit belongs to
    const unit = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'org_units')
      .where('org_units.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    // users for which the role in this unit is the only active role will be locked
    const usersToLock = (
      await this.sqlConnection
        .createQueryBuilder(UserRoleEntity, 'ur')
        .select('ur.user_id', 'userId')
        .addSelect('count(*)', 'cnt')
        .addSelect('u.external_id', 'identityId')
        .innerJoin('user_role', 'r', 'ur.user_id = r.user_id')
        .innerJoin('user', 'u', 'ur.user_id = u.id')
        .where('r.organisation_unit_id = :orgUnitId', { orgUnitId: unitId })
        .andWhere('ur.is_active = 1')
        .andWhere('r.lockedAt IS NULL')
        .andWhere('u.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
        .groupBy('ur.user_id, u.external_id')
        .having('count(*) = 1')
        .getRawMany()
    ).map(ur => ({ id: ur.userId as string, identityId: ur.identityId as string }));

    // only want to clear actions with these statuses
    const actionStatusToClear = [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED];

    //get id of actions to clear issued by the unit users
    const actionsToClear = (
      await this.sqlConnection
        .createQueryBuilder(InnovationActionEntity, 'action')
        .leftJoinAndSelect('action.innovationSupport', 'support')
        .leftJoinAndSelect('support.organisationUnit', 'unit')
        .where('unit.id = :unitId', { unitId })
        .andWhere('action.status IN (:...actionStatusToClear)', { actionStatusToClear })
        .getMany()
    ).map(a => a.id);

    //only want to complete the support of innovations with these statuses
    const supportStatusToComplete = [
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED
    ];

    //get supports to complete
    const supportsToComplete = await this.sqlConnection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .leftJoinAndSelect('support.organisationUnit', 'unit')
      .leftJoinAndSelect('support.innovation', 'innovation')
      .leftJoinAndSelect('support.organisationUnitUsers', 'assignedUsers')
      .where('unit.id = :unitId', { unitId })
      .andWhere('support.status IN (:...supportStatusToComplete)', { supportStatusToComplete })
      .getMany();

    const contexts = [...actionsToClear, ...supportsToComplete.map(s => s.id)];

    let notificationsToMarkAsRead: NotificationEntity[] = [];

    if (contexts.length > 0) {
      notificationsToMarkAsRead = await this.sqlConnection
        .createQueryBuilder(NotificationEntity, 'notification')
        .innerJoinAndSelect('notification.notificationUsers', 'notificationUser')
        .where('notification.context_id IN (:...contexts)', { contexts })
        .andWhere('notificationUser.read_at IS NULL')
        .getMany();
    }

    const result = await this.sqlConnection.transaction(async transaction => {
      const now = new Date();

      // Inactivate unit
      await transaction.update(OrganisationUnitEntity, { id: unitId }, { inactivatedAt: now });

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
        const supportIds = supportsToComplete.map(s => s.id);

        await transaction.update(
          InnovationSupportEntity,
          { id: In(supportIds) },
          {
            status: InnovationSupportStatusEnum.COMPLETE
          }
        );

        await transaction
          .createQueryBuilder()
          .delete()
          .from('innovation_support_user')
          .where('innovation_support_id IN (:...supports)', { supports: supportIds })
          .execute();
      }

      // Mark as read notifications in the context of this unit
      if (notificationsToMarkAsRead.length > 0) {
        await transaction.update(
          NotificationUserEntity,
          { notification: In(notificationsToMarkAsRead.map(n => n.id)) },
          { readAt: now }
        );
      }

      // lock users of unit with only one active role
      if (usersToLock.length > 0) {
        await transaction.update(
          UserEntity,
          { id: In(usersToLock.map(ur => ur.id)) },
          { lockedAt: now, updatedAt: now, status: UserStatusEnum.LOCKED }
        );
      }

      // lock all roles of unit
      await transaction.update(
        UserRoleEntity,
        { organisationUnit: unitId, lockedAt: IsNull() },
        { isActive: false, updatedAt: now }
      );

      const organisationId = unit.organisationId;

      // get number of active units in organisation
      const activeUnitsCounter = await transaction
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.inactivatedAt IS NULL')
        .andWhere('unit.organisation_id = :organisationId', { organisationId })
        .getCount();

      // inactivate organisation if it has no active units
      if (activeUnitsCounter === 0) {
        await transaction.update(OrganisationEntity, { id: organisationId }, { inactivatedAt: now });
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
            suggestedOrganisationUnits: []
          }
        );

        await this.notifierService.send(domainContext, NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED, {
          innovationId: support.innovation.id,
          unitId
        });
      }
      return { unitId };
    });

    // lock users in identity provider asynchronously
    // using idendity-ops-queue
    if (usersToLock.length > 0) {
      for (const user of usersToLock) {
        await this.identityProviderService.updateUserAsync(user.identityId, {
          accountEnabled: false
        });
      }
    }

    return result;
  }

  async activateUnit(
    requestUser: DomainContextType,
    organisationId: string,
    unitId: string,
    userIds: string[]
  ): Promise<{ unitId: string }> {
    const unit = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
      .innerJoinAndSelect('org_unit.organisation', 'organisation')
      .where('org_unit.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    // unlocked locked users of selected users
    const usersToUnlock = await this.sqlConnection
      .createQueryBuilder(UserRoleEntity, 'ur')
      .select(['ur.id', 'ur.role', 'user.id', 'user.identityId'])
      .innerJoin('ur.user', 'user')
      .where('ur.user_id IN (:...userIds)', { userIds })
      .andWhere('ur.organisation_unit_id = :unitId', { unitId }) //ensure users have role in unit
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getMany();

    // unlock locked roles of selected users
    const rolesToUnlock = await this.sqlConnection
      .createQueryBuilder(UserRoleEntity, 'ur')
      .select(['ur.id', 'ur.role'])
      .where('ur.organisation_unit_id = :unitId', { unitId }) // ensure users have role in unit
      .andWhere('ur.user_id IN (:...userIds)', { userIds })
      .andWhere('ur.is_active = 0')
      .getMany();

    //check if at least 1 user is QA
    const canActivate =
      usersToUnlock.some(ur => ur.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) ||
      rolesToUnlock.some(ur => ur.role === ServiceRoleEnum.QUALIFYING_ACCESSOR);

    if (!canActivate) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ACTIVATE_NO_QA);
    }

    const result = await this.sqlConnection.transaction(async transaction => {
      const now = new Date();

      // Activate unit
      await transaction.update(
        OrganisationUnitEntity,
        { id: unitId },
        { inactivatedAt: null, updatedAt: now, updatedBy: requestUser.id }
      );

      // activate organistion to whom unit belongs if it is inactivated
      if (unit.organisation.inactivatedAt !== null) {
        await transaction.update(
          OrganisationEntity,
          { id: organisationId },
          { inactivatedAt: null, updatedAt: now, updatedBy: requestUser.id }
        );

        // Just send the announcement if this is the first time the organization has been activated.
        if (DatesHelper.isDateEqual(unit.organisation.createdAt, unit.organisation.inactivatedAt)) {
          await this.createOrganisationAnnouncement(
            requestUser,
            unit.organisation.id,
            unit.organisation.name,
            transaction
          );
        }
      }

      // Activate users of unit and roles
      const usersToUnlockId = usersToUnlock.map(u => u.user.id);

      await transaction.update(
        UserEntity,
        { id: In(usersToUnlockId) },
        { lockedAt: null, updatedAt: now, updatedBy: requestUser.id, status: UserStatusEnum.ACTIVE }
      );

      await transaction.update(
        UserRoleEntity,
        { id: In(rolesToUnlock.map(r => r.id)), organisationUnit: unitId },
        { isActive: true, updatedAt: now, updatedBy: requestUser.id }
      );

      return { unitId };
    });

    // unlock users in identity provider asynchronously
    // using identity-ops-queue
    for (const userRole of usersToUnlock) {
      await this.identityProviderService.updateUserAsync(userRole.user.identityId, {
        accountEnabled: true
      });
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
    return this.sqlConnection.transaction(async transaction => {
      const unit = await transaction
        .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
        .where('org_unit.id = :unitId', { unitId })
        .getOne();

      if (!unit) {
        throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }

      const unitNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
        .where('(org_unit.name = :name OR org_unit.acronym = :acronym) AND (org_unit.id != :unitId)', {
          name,
          acronym,
          unitId
        })
        .getOne();

      if (unitNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS);
      }

      await transaction.update(
        OrganisationUnitEntity,
        { id: unit.id },
        {
          name: name,
          acronym: acronym
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
    return this.sqlConnection.transaction(async transaction => {
      const organisation = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .innerJoinAndSelect('org.organisationUnits', 'organisationUnits')
        .where('org.id = :organisationId', { organisationId })
        .getOne();

      if (!organisation) {
        throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }

      const orgNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .where('(org.name = :name OR org.acronym = :acronym) AND org.id != :organisationId AND org.type=:type', {
          name,
          acronym,
          organisationId,
          type: OrganisationTypeEnum.ACCESSOR
        })
        .getOne();

      if (orgNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS);
      }

      await transaction.update(
        OrganisationEntity,
        { id: organisation.id },
        {
          name: name,
          acronym: acronym
        }
      );

      if ((await organisation.organisationUnits).length == 1) {
        // if organisation only has one unit (shadow), the name and acronym
        // of this unit must also be changed

        const unitIds = (await organisation.organisationUnits).map(u => u.id);

        await transaction.update(
          OrganisationUnitEntity,
          { id: unitIds[0] },
          {
            name: name,
            acronym: acronym
          }
        );
      }

      return { id: organisation.id };
    });
  }

  async createOrganisation(
    domainContext: DomainContextType,
    data: {
      name: string;
      acronym: string;
      units?: { name: string; acronym: string }[];
    }
  ): Promise<{
    id: string;
    units: string[];
  }> {
    const result = await this.sqlConnection.transaction(async transaction => {
      const orgNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .where('org.name = :name OR org.acronym = :acronym', {
          name: data.name,
          acronym: data.acronym
        })
        .getOne();

      if (orgNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS);
      }

      const now = new Date();
      const org = OrganisationEntity.new({
        name: data.name,
        acronym: data.acronym,
        createdBy: domainContext.id,
        createdAt: now,
        inactivatedAt: now,
        updatedAt: now,
        updatedBy: domainContext.id,
        type: OrganisationTypeEnum.ACCESSOR,
        isShadow: false
      });

      const savedOrganisation = await transaction.save(OrganisationEntity, org);

      /*
          units can only have length 0 or greater than 1
          if 0 -> create shadow unit
          if > 1 -> create specified units
        */
      const savedUnits: OrganisationUnitEntity[] = [];
      if (data.units && data.units.length > 1) {
        //create specified units
        for (const unit of data.units) {
          const u = await this.createOrganisationUnit(
            savedOrganisation.id,
            unit.name,
            unit.acronym,
            false,
            transaction
          );
          savedUnits.push(u);
        }
      } else {
        //create shadow unit
        const shadowUnit = await this.createOrganisationUnit(org.id, data.name, data.acronym, true, transaction);
        savedUnits.push(shadowUnit);
      }

      return { id: savedOrganisation.id, units: savedUnits };
    });

    return { id: result.id, units: result.units.map(u => u.id) };
  }

  async createUnit(organisationId: string, name: string, acronym: string): Promise<{ id: string }> {
    const unit = await this.sqlConnection.transaction(async transaction => {
      return this.createOrganisationUnit(organisationId, name, acronym, false, transaction);
    });

    return { id: unit.id };
  }

  async createUnitUser(
    domainContext: DomainContextType,
    organisationUnitId: string,
    userId: string,
    data: { role: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.QUALIFYING_ACCESSOR },
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Start Validations
    const unit = await connection
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .select(['organisation.id', 'organisation.inactivatedAt', 'unit.id', 'unit.inactivatedAt'])
      .innerJoin('unit.organisation', 'organisation')
      .where('unit.id = :organisationUnitId', { organisationUnitId })
      .getOne();
    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNITS_NOT_FOUND);
    }

    const roles = await connection
      .createQueryBuilder(UserRoleEntity, 'role')
      .select(['role.id', 'role.role', 'organisation.id', 'unit.id'])
      .leftJoin('role.organisation', 'organisation')
      .leftJoin('role.organisationUnit', 'unit')
      .where('role.user_id = :userId', { userId })
      .getMany();
    if (!roles.length) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND);
    }

    const { userRole } = ValidationsHelper.canAddUserToUnit(roles, unit.organisation.id, organisationUnitId);
    if (userRole && userRole !== data.role) {
      throw new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_MISMATCH_ROLE);
    }
    // End Validations

    await connection.transaction(async transaction => {
      const organisationUser = await this.getOrCreateOrganisationUser(
        unit.organisation.id,
        userId,
        data.role,
        domainContext.id,
        transaction
      );

      await transaction.save(
        OrganisationUnitUserEntity,
        OrganisationUnitUserEntity.new({
          organisationUnit: unit,
          organisationUser: organisationUser,
          createdBy: domainContext.id,
          updatedBy: domainContext.id
        })
      );

      await transaction.save(
        UserRoleEntity,
        UserRoleEntity.new({
          user: UserEntity.new({ id: userId }),
          role: data.role,
          organisation: unit.organisation,
          organisationUnit: unit,
          createdBy: domainContext.id,
          updatedBy: domainContext.id,
          isActive: !unit.inactivatedAt
        })
      );
    });
  }

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

    // don't allow units with the same name or acronym inside the same organisation
    const unitNameOrAcronymAlreadyExists = await transaction
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.organisation_id = :organisationId', { organisationId })
      .andWhere('(unit.name = :name OR unit.acronym = :acronym)', { name, acronym })
      .getOne();

    if (unitNameOrAcronymAlreadyExists) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS);
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

    return savedUnit;
  }

  private async getOrCreateOrganisationUser(
    organisationId: string,
    userId: string,
    role: ServiceRoleEnum,
    requestUserId: string,
    entityManager?: EntityManager
  ): Promise<OrganisationUserEntity> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const organisationUser = await connection
      .createQueryBuilder(OrganisationUserEntity, 'orgUser')
      .where('orgUser.user_id = :userId', { userId })
      .andWhere('orgUser.organisation_id = :organisationId', { organisationId })
      .getOne();

    if (organisationUser) {
      return organisationUser;
    }

    return await connection.save(
      OrganisationUserEntity,
      OrganisationUserEntity.new({
        organisation: OrganisationEntity.new({ id: organisationId }),
        user: UserEntity.new({ id: userId }),
        role: role as any,
        createdBy: requestUserId,
        updatedBy: requestUserId
      })
    );
  }

  private async createOrganisationAnnouncement(
    requestUser: DomainContextType,
    _organisationId: string,
    orgName: string,
    transaction: EntityManager
  ): Promise<void> {
    // If we need to exclude users again
    // const orgUsers = await transaction
    //   .createQueryBuilder(UserRoleEntity, 'userRole')
    //   .where('userRole.organisation_id = :organisationId', { organisationId })
    //   .getMany();
    // const usersToExclude = orgUsers.map(u => u.userId);

    const reusableAnnouncementInfo = {
      title: 'A new support organisation has been added',
      inset: {
        title: `${orgName} has been added to the Innovation Service`,
        link: {
          label: 'What does this organisation do? (open in a new window)',
          url: new UrlModel(ENV.webBaseUrl).addPath('about-the-service/who-we-are').buildUrl()
        }
      },
      startsAt: new Date()
    };

    await this.announcementsService.createAnnouncement(
      requestUser,
      {
        userRoles: [ServiceRoleEnum.INNOVATOR],
        title: reusableAnnouncementInfo.title,
        startsAt: reusableAnnouncementInfo.startsAt,
        params: {
          inset: reusableAnnouncementInfo.inset,
          content:
            'If you think this organisation will be able to support you, you can share your innovation with them in your data sharing preferences.'
        }
      },
      {},
      transaction
    );

    await this.announcementsService.createAnnouncement(
      requestUser,
      {
        userRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
        title: reusableAnnouncementInfo.title,
        startsAt: reusableAnnouncementInfo.startsAt,
        params: {
          inset: reusableAnnouncementInfo.inset,
          content:
            'If you think this organisation could offer suitable support to an innovation, you can suggest it to them.'
        }
      },
      {},
      transaction
    );

    await this.announcementsService.createAnnouncement(
      requestUser,
      {
        userRoles: [ServiceRoleEnum.ACCESSOR],
        title: reusableAnnouncementInfo.title,
        startsAt: reusableAnnouncementInfo.startsAt,
        params: {
          inset: reusableAnnouncementInfo.inset
        }
      },
      {},
      transaction
    );
  }
}
