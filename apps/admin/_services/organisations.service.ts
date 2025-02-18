import { inject, injectable } from 'inversify';
import { EntityManager, In } from 'typeorm';

import {
  InnovationSupportEntity,
  InnovationTaskEntity,
  NotificationEntity,
  NotificationUserEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@admin/shared/entities';
import {
  AnnouncementTypeEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@admin/shared/enums';
import { NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';
import { DatesHelper } from '@admin/shared/helpers';
import type { DomainService, IdentityProviderService, NotifierService } from '@admin/shared/services';
import type { DomainContextType } from '@admin/shared/types';

import { UrlModel } from '@admin/shared/models';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { ENV } from '../_config';
import { AnnouncementsService } from './announcements.service';
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
    domainContext: DomainContextType,
    unitId: string,
    entityManager?: EntityManager
  ): Promise<{ unitId: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    // get the organisation to whom the unit belongs to
    const unit = await em
      .createQueryBuilder(OrganisationUnitEntity, 'org_units')
      .where('org_units.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    // users for which the role in this unit is the only active role will be locked
    const usersToLock = (
      await em
        .createQueryBuilder(UserRoleEntity, 'ur')
        .select('ur.user_id', 'userId')
        .addSelect('count(*)', 'cnt')
        .addSelect('u.external_id', 'identityId')
        .innerJoin('user_role', 'r', 'ur.user_id = r.user_id')
        .innerJoin('user', 'u', 'ur.user_id = u.id')
        .where('r.organisation_unit_id = :orgUnitId', { orgUnitId: unitId })
        .andWhere('ur.is_active = 1')
        .andWhere('r.is_active = 1')
        .andWhere('u.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
        .groupBy('ur.user_id, u.external_id')
        .having('count(*) = 1')
        .getRawMany()
    ).map(ur => ({ id: ur.userId as string, identityId: ur.identityId as string }));

    //get id of actions to clear issued by the unit users
    const tasksToClear = (
      await em
        .createQueryBuilder(InnovationTaskEntity, 'action')
        .leftJoinAndSelect('action.innovationSupport', 'support')
        .leftJoinAndSelect('support.organisationUnit', 'unit')
        .where('unit.id = :unitId', { unitId })
        .andWhere('action.status = :openTaskStatus', { openTaskStatus: InnovationTaskStatusEnum.OPEN })
        .getMany()
    ).map(a => a.id);

    //only want to complete the support of innovations with these statuses
    const supportStatusToComplete = [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING];

    //get supports to complete
    const supportsToClose = await em
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select(['support.id', 'support.status', 'innovation.id'])
      .innerJoin('support.organisationUnit', 'unit')
      .innerJoin('support.innovation', 'innovation')
      .where('unit.id = :unitId', { unitId })
      .andWhere('support.status IN (:...supportStatusToComplete)', { supportStatusToComplete })
      .getMany();

    const contexts = [...tasksToClear, ...supportsToClose.map(s => s.id)];

    let notificationsToMarkAsRead: NotificationEntity[] = [];

    if (contexts.length > 0) {
      notificationsToMarkAsRead = await em
        .createQueryBuilder(NotificationEntity, 'notification')
        .innerJoinAndSelect('notification.notificationUsers', 'notificationUser')
        .where('notification.context_id IN (:...contexts)', { contexts })
        .andWhere('notificationUser.read_at IS NULL')
        .getMany();
    }

    const result = await em.transaction(async transaction => {
      const now = new Date();

      // Inactivate unit
      await transaction.update(OrganisationUnitEntity, { id: unitId }, { inactivatedAt: now });

      // Clear actions issued by unit
      if (tasksToClear.length > 0) {
        await transaction.update(
          InnovationTaskEntity,
          { id: In(tasksToClear) },
          { status: InnovationTaskStatusEnum.CANCELLED }
        );
      }

      // Close supports of unit
      if (supportsToClose.length > 0) {
        const supportIds = supportsToClose.map(s => s.id);

        await transaction.update(
          InnovationSupportEntity,
          { id: In(supportIds) },
          { status: InnovationSupportStatusEnum.CLOSED }
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
        { organisationUnit: unitId, isActive: true },
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

      for (const support of supportsToClose) {
        await this.domainService.innovations.addSupportLog(
          transaction,
          { id: domainContext.id, roleId: domainContext.currentRole.id },
          support.innovation.id,
          {
            type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
            supportStatus: InnovationSupportStatusEnum.CLOSED,
            description: 'Unit inactivated',
            unitId
          }
        );
      }

      // Notify owners with supports to close
      if (supportsToClose.length > 0) {
        await this.notifierService.send(domainContext, NotifierTypeEnum.UNIT_INACTIVATED, {
          unitId,
          completedInnovationIds: supportsToClose.map(s => s.innovation.id)
        });
      }

      return { unitId };
    });

    // lock users in identity provider asynchronously
    // using identity-ops-queue
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
    domainContext: DomainContextType,
    organisationId: string,
    unitId: string,
    userIds: string[],
    entityManager?: EntityManager
  ): Promise<{ unitId: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const unit = await em
      .createQueryBuilder(OrganisationUnitEntity, 'org_unit')
      .innerJoinAndSelect('org_unit.organisation', 'organisation')
      .where('org_unit.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    // unlocked locked users of selected users
    const usersToUnlock = await em
      .createQueryBuilder(UserRoleEntity, 'ur')
      .select(['ur.id', 'ur.role', 'user.id', 'user.identityId'])
      .innerJoin('ur.user', 'user')
      .where('ur.user_id IN (:...userIds)', { userIds })
      .andWhere('ur.organisation_unit_id = :unitId', { unitId }) //ensure users have role in unit
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.LOCKED })
      .getMany();

    // unlock locked roles of selected users
    const rolesToUnlock = await em
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

    const result = await em.transaction(async transaction => {
      const now = new Date();

      // Activate unit
      await transaction.update(
        OrganisationUnitEntity,
        { id: unitId },
        { inactivatedAt: null, updatedAt: now, updatedBy: domainContext.id }
      );

      // activate organisation to whom unit belongs if it is inactivated
      if (unit.organisation.inactivatedAt !== null) {
        await transaction.update(
          OrganisationEntity,
          { id: organisationId },
          { inactivatedAt: null, updatedAt: now, updatedBy: domainContext.id }
        );

        // Just send the announcement if this is the first time the organization has been activated.
        if (DatesHelper.isDateEqual(unit.organisation.createdAt, unit.organisation.inactivatedAt)) {
          await this.createOrganisationAnnouncement(domainContext, organisationId, unit.organisation.name, transaction);
        }
      }

      // Activate users of unit and roles
      const usersToUnlockId = usersToUnlock.map(u => u.user.id);

      await transaction.update(
        UserEntity,
        { id: In(usersToUnlockId) },
        { lockedAt: null, updatedAt: now, updatedBy: domainContext.id, status: UserStatusEnum.ACTIVE }
      );

      await transaction.update(
        UserRoleEntity,
        { id: In(rolesToUnlock.map(r => r.id)), organisationUnit: unitId },
        { isActive: true, updatedAt: now, updatedBy: domainContext.id }
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
    acronym: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    return em.transaction(async transaction => {
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
    acronym: string,
    summary: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    return em.transaction(async transaction => {
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
        .where('(org.name = :name OR org.acronym = :acronym) AND org.id != :organisationId AND org.type= :type', {
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
          acronym: acronym,
          summary: summary
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
      summary: string;
      units?: { name: string; acronym: string }[];
    },
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    units: string[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const result = await em.transaction(async transaction => {
      const orgNameOrAcronymAlreadyExists = await transaction
        .createQueryBuilder(OrganisationEntity, 'org')
        .where('(org.name = :name OR org.acronym = :acronym) AND org.type = :type', {
          name: data.name,
          acronym: data.acronym,
          type: OrganisationTypeEnum.ACCESSOR
        })
        .getOne();

      if (orgNameOrAcronymAlreadyExists) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS);
      }

      const now = new Date();
      const org = OrganisationEntity.new({
        name: data.name,
        acronym: data.acronym,
        summary: data.summary,
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

  async createUnit(
    organisationId: string,
    name: string,
    acronym: string,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const unit = await em.transaction(async transaction => {
      return this.createOrganisationUnit(organisationId, name, acronym, false, transaction);
    });

    return { id: unit.id };
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
      .where('(unit.name = :name OR unit.acronym = :acronym)', { name, acronym })
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

  private async createOrganisationAnnouncement(
    requestUser: DomainContextType,
    organisationId: string,
    orgName: string,
    transaction: EntityManager
  ): Promise<void> {
    const title = 'A new support organisation has joined the NHS Innovation Service';
    const startsAt = new Date();
    const link = {
      label: 'What does this organisation do?',
      url: new UrlModel(ENV.webBaseUrl).addPath('about-the-service/who-we-are').buildUrl()
    };

    await this.announcementsService.createAnnouncement(
      requestUser,
      {
        userRoles: [ServiceRoleEnum.INNOVATOR],
        title: title,
        startsAt: startsAt,
        params: {
          link: {
            ...link,
            url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/organisation/:organisationId/share-innovations-with-org')
              .setPathParams({ organisationId })
              .buildUrl()
          },
          content: `${orgName} is now available to support innovators through the NHS Innovation Service.
            If you believe this organisation can assist with your innovation, you can update your data sharing preferences to share your information with them.
            For more about this organisation, please read:`
        },
        type: AnnouncementTypeEnum.HOMEPAGE,
        sendEmail: true
      },
      {},
      transaction
    );

    await this.announcementsService.createAnnouncement(
      requestUser,
      {
        userRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
        title: title,
        startsAt: startsAt,
        params: {
          link,
          content: `${orgName} is now available to support innovators through the NHS Innovation Service.
            If you think this organisation could offer suitable support to an innovation that you are supporting, you can suggest it to them now.`
        },
        type: AnnouncementTypeEnum.HOMEPAGE,
        sendEmail: true
      },
      {},
      transaction
    );

    await this.announcementsService.createAnnouncement(
      requestUser,
      {
        userRoles: [ServiceRoleEnum.ACCESSOR],
        title: title,
        startsAt: startsAt,
        params: {
          link,
          content: `${orgName} is now available to support innovators through the NHS Innovation Service.`
        },
        type: AnnouncementTypeEnum.HOMEPAGE,
        sendEmail: true
      },
      {},
      transaction
    );
  }
}
