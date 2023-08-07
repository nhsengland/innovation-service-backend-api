import { TestsHelper } from '@admin/shared/tests';

import { container } from '../_config';
import SYMBOLS from './symbols';
import { EntityManager } from 'typeorm';
import {
  InnovationActionStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  UserStatusEnum
} from '@admin/shared/enums';
import { DTOsHelper } from '@admin/shared/tests/helpers/dtos.helper';
import {
  InnovationActionEntity,
  InnovationSupportEntity,
  NotificationUserEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity
} from '@admin/shared/entities';
import { UserRoleEntity } from '@admin/shared/entities';
import { NotificationBuilder } from '@admin/shared/tests/builders/notification.builder';
import { DomainInnovationsService, NotifierService } from '@admin/shared/services';
import { randPastDate, randUuid } from '@ngneat/falso';
import { NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';
import type { OrganisationsService } from './organisations.service';

describe('Admin / _services / organisations service suite', () => {
  let sut: OrganisationsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');

  beforeAll(async () => {
    sut = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    notifierSendSpy.mockReset();
    supportLogSpy.mockReset();
  });

  describe('inactivateUnit', () => {
    const unit = scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit;

    it('should inactivate the unit', async () => {
      const result = await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

      expect(result).toMatchObject({ unitId: unit.id });

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: unit.id })
        .getOne();

      expect(dbUnit?.inactivatedAt).toBeTruthy();
    });

    it('should lock all user roles of unit', async () => {
      await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

      const userRolesOfUnit = [
        scenario.users.jamieMadroxAccessor.roles.aiRole,
        scenario.users.sarahQualifyingAccessor.roles.qaRole,
        scenario.users.bartQualifyingAccessor.roles.qaRole
      ];

      const dbUserRoles = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .where('role.id IN (:...userRoleIds)', { userRoleIds: userRolesOfUnit.map(userRole => userRole.id) })
        .getMany();

      dbUserRoles.forEach(dbRole => {
        expect(dbRole.isActive).toBeFalsy();
      });
    });

    it('should lock all users whose only active role was in this unit', async () => {
      await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

      const dbUserToLock = await em
        .createQueryBuilder(UserEntity, 'user')
        .where('user.id = :userId', { userId: scenario.users.sarahQualifyingAccessor.id })
        .getOne();

      expect(dbUserToLock?.lockedAt).toBeTruthy();

      const dbUserToNotLock = await em
        .createQueryBuilder(UserEntity, 'user')
        .where('user.id = :userId', { userId: scenario.users.jamieMadroxAccessor.id })
        .getOne();

      expect(dbUserToNotLock?.lockedAt).toBeFalsy();
    });

    it('should inactivate the organisation if this unit was the only active unit', async () => {
      await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);
      await sut.inactivateUnit(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
        em
      );

      const orgToNotInactivate = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: scenario.organisations.healthOrg.id })
        .getOne();

      expect(orgToNotInactivate?.inactivatedAt).toBeFalsy();

      const orgToInactivate = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: scenario.organisations.medTechOrg.id })
        .getOne();

      expect(orgToInactivate?.inactivatedAt).toBeTruthy();
    });

    describe.each([InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED])(
      '%s actions by accessors of unit',
      status => {
        const action = scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByBart;

        it('should delete actions', async () => {
          // prepare action
          await em.getRepository(InnovationActionEntity).update({ id: action.id }, { status: status });

          await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

          const dbAction = await em
            .createQueryBuilder(InnovationActionEntity, 'action')
            .withDeleted()
            .where('action.id = :actionId', { actionId: action.id })
            .getOne();

          expect(dbAction?.status).toBe(InnovationActionStatusEnum.DELETED);
        });

        it('should clear all related notifications', async () => {
          // prepare action
          await em.getRepository(InnovationActionEntity).update({ id: action.id }, { status: status });

          // create related notification
          const notification = await new NotificationBuilder(em)
            .setInnovation(scenario.users.johnInnovator.innovations.johnInnovation.id)
            .addNotificationUser(scenario.users.bartQualifyingAccessor)
            .setContext(NotificationContextTypeEnum.ACTION, NotificationContextDetailEnum.ACTION_CREATION, action.id)
            .save();

          await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

          const dbNotificationUser = await em
            .createQueryBuilder(NotificationUserEntity, 'notification_user')
            .where('notification_user.id = :notificationUserId', {
              notificationUserId: notification.notificationUsers.get(
                scenario.users.bartQualifyingAccessor.roles.qaRole.id
              )?.id
            })
            .getOne();

          expect(dbNotificationUser?.readAt).toBeTruthy();
        });
      }
    );

    describe.each([InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED])(
      '%s supports of unit',
      status => {
        const support = scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgAiUnit;
        it('should complete the support', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

          const dbSupport = await em
            .createQueryBuilder(InnovationSupportEntity, 'support')
            .where('support.id = :supportId', { supportId: support.id })
            .getOne();

          expect(dbSupport?.status).toBe(InnovationSupportStatusEnum.COMPLETE);
        });

        it('should clear all related notifications', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          // create related notification
          const notification = await new NotificationBuilder(em)
            .setInnovation(scenario.users.johnInnovator.innovations.johnInnovation.id)
            .addNotificationUser(scenario.users.bartQualifyingAccessor)
            .setContext(
              NotificationContextTypeEnum.SUPPORT,
              NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
              support.id
            )
            .save();

          await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

          const dbNotificationUser = await em
            .createQueryBuilder(NotificationUserEntity, 'notification_user')
            .where('notification_user.id = :notificationUserId', {
              notificationUserId: notification.notificationUsers.get(
                scenario.users.bartQualifyingAccessor.roles.qaRole.id
              )?.id
            })
            .getOne();

          expect(dbNotificationUser?.readAt).toBeTruthy();
        });

        it('should send a notification for each completed support', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          await sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), unit.id, em);

          expect(notifierSendSpy).toHaveBeenCalledWith(
            DTOsHelper.getUserRequestContext(scenario.users.allMighty),
            NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
            {
              innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
              unitId: unit.id
            }
          );
        });

        it('should create support log entry for each completed support', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          const domainContext = DTOsHelper.getUserRequestContext(scenario.users.allMighty);
          await sut.inactivateUnit(domainContext, unit.id, em);

          expect(supportLogSpy).toHaveBeenCalledWith(
            expect.any(EntityManager),
            { id: domainContext.id, roleId: domainContext.currentRole.id },
            scenario.users.johnInnovator.innovations.johnInnovation.id,
            {
              type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
              supportStatus: status,
              description: 'Unit inactivated',
              unitId: unit.id
            }
          );
        });
      }
    );

    it(`should throw an error if the unit doesn't exist`, async () => {
      await expect(() =>
        sut.inactivateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), randUuid(), em)
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });
  });

  describe('activateUnit', () => {
    const organisation = scenario.organisations.healthOrg;
    const unit = scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit;
    const userToUnlock = scenario.users.bartQualifyingAccessor;

    beforeEach(async () => {
      // prepare unit
      await em.getRepository(OrganisationUnitEntity).update({ id: unit.id }, { inactivatedAt: randPastDate() });

      //prepare QA
      await em
        .getRepository(UserEntity)
        .update({ id: userToUnlock.id }, { lockedAt: randPastDate(), status: UserStatusEnum.LOCKED });
      await em.getRepository(UserRoleEntity).update({ id: userToUnlock.roles.qaRole.id }, { isActive: false });
    });

    it('should activate the unit', async () => {
      const result = await sut.activateUnit(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        organisation.id,
        unit.id,
        [scenario.users.bartQualifyingAccessor.id],
        em
      );

      expect(result).toMatchObject({ unitId: unit.id });

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: unit.id })
        .getOne();

      expect(dbUnit?.inactivatedAt).toBeFalsy();
    });

    it('should activate the organisation if it was inactive', async () => {
      //prepare organisation
      await em.getRepository(OrganisationEntity).update({ id: organisation.id }, { inactivatedAt: randPastDate() });

      await sut.activateUnit(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        organisation.id,
        unit.id,
        [scenario.users.bartQualifyingAccessor.id],
        em
      );

      const dbOrganisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: organisation.id })
        .getOne();

      expect(dbOrganisation?.inactivatedAt).toBeFalsy();
    });

    it('should unlock all specified users of the unit', async () => {
      await sut.activateUnit(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        organisation.id,
        unit.id,
        [userToUnlock.id],
        em
      );

      const dbUser = await em
        .createQueryBuilder(UserEntity, 'user')
        .where('user.id = :userId', { userId: userToUnlock.id })
        .getOne();

      expect(dbUser?.lockedAt).toBeFalsy();
      expect(dbUser?.status).toBe(UserStatusEnum.ACTIVE);
    });

    it('should unlock corresponding unit role of all specified users', async () => {
      await sut.activateUnit(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        organisation.id,
        unit.id,
        [userToUnlock.id],
        em
      );

      const dbUserRole = await em
        .createQueryBuilder(UserRoleEntity, 'userRole')
        .where('userRole.id = :userRoleId', { userRoleId: userToUnlock.roles.qaRole.id })
        .getOne();

      expect(dbUserRole?.isActive).toBeTruthy();
    });

    it(`should throw an error if the unit doesn't exist`, async () => {
      await expect(() =>
        sut.activateUnit(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          organisation.id,
          randUuid(),
          [scenario.users.bartQualifyingAccessor.id],
          em
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should throw an error if the unit has no active QA', async () => {
      await expect(() =>
        sut.activateUnit(DTOsHelper.getUserRequestContext(scenario.users.allMighty), organisation.id, unit.id, [scenario.users.adamInnovator.id], em)
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ACTIVATE_NO_QA));
    });
  });
});
