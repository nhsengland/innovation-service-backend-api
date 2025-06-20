import { TestsHelper } from '@admin/shared/tests';

import {
  InnovationSupportEntity,
  InnovationTaskEntity,
  NotificationUserEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@admin/shared/entities';
import {
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  UserStatusEnum
} from '@admin/shared/enums';
import { NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';
import { DomainInnovationsService, NotifierService } from '@admin/shared/services';
import { NotificationBuilder } from '@admin/shared/tests/builders/notification.builder';
import { DTOsHelper } from '@admin/shared/tests/helpers/dtos.helper';
import { randAlpha, randCompanyName, randPastDate, randText, randUrl, randUuid } from '@ngneat/falso';
import { EntityManager } from 'typeorm';
import { container } from '../_config';
import type { OrganisationsService } from './organisations.service';
import SYMBOLS from './symbols';

describe('Admin / _services / organisations service suite', () => {
  let sut: OrganisationsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');

  const domainContext = DTOsHelper.getUserRequestContext(scenario.users.allMighty);

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
      const result = await sut.inactivateUnit(domainContext, unit.id, em);

      expect(result).toMatchObject({ unitId: unit.id });

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: unit.id })
        .getOne();

      expect(dbUnit?.inactivatedAt).toBeTruthy();
    });

    it('should lock all user roles of unit', async () => {
      await sut.inactivateUnit(domainContext, unit.id, em);

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
      await sut.inactivateUnit(domainContext, unit.id, em);

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
      await sut.inactivateUnit(domainContext, unit.id, em);
      await sut.inactivateUnit(
        domainContext,
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

    describe.each([InnovationTaskStatusEnum.OPEN])('%s tasks by accessors of unit', status => {
      const task = scenario.users.johnInnovator.innovations.johnInnovation.tasks.taskByBart;

      it('should cancel tasks', async () => {
        await em.getRepository(InnovationTaskEntity).update({ id: task.id }, { status: status });
        await sut.inactivateUnit(domainContext, unit.id, em);

        const dbTask = await em
          .createQueryBuilder(InnovationTaskEntity, 'task')
          .withDeleted()
          .where('task.id = :taskId', { taskId: task.id })
          .getOne();

        expect(dbTask?.status).toBe(InnovationTaskStatusEnum.CANCELLED);
      });

      it('should clear all related notifications', async () => {
        // prepare task
        await em.getRepository(InnovationTaskEntity).update({ id: task.id }, { status: status });

        // create related notification
        const notification = await new NotificationBuilder(em)
          .setInnovation(scenario.users.johnInnovator.innovations.johnInnovation.id)
          .addNotificationUser(scenario.users.bartQualifyingAccessor)
          .setContext('TASK', 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', task.id)
          .save();

        await sut.inactivateUnit(domainContext, unit.id, em);

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
    });

    describe.each([InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING])(
      '%s supports of unit',
      status => {
        const support = scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgAiUnit;
        it('should close the support', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          await sut.inactivateUnit(domainContext, unit.id, em);

          const dbSupport = await em
            .createQueryBuilder(InnovationSupportEntity, 'support')
            .where('support.id = :supportId', { supportId: support.id })
            .getOne();

          expect(dbSupport?.status).toBe(InnovationSupportStatusEnum.CLOSED);
        });

        it('should clear all related notifications', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          // create related notification
          const notification = await new NotificationBuilder(em)
            .setInnovation(scenario.users.johnInnovator.innovations.johnInnovation.id)
            .addNotificationUser(scenario.users.bartQualifyingAccessor)
            .setContext('SUPPORT', 'ST01_SUPPORT_STATUS_TO_ENGAGING', support.id)
            .save();

          await sut.inactivateUnit(domainContext, unit.id, em);

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

          await sut.inactivateUnit(domainContext, unit.id, em);

          expect(notifierSendSpy).toHaveBeenCalledWith(domainContext, NotifierTypeEnum.UNIT_INACTIVATED, {
            unitId: unit.id,
            completedInnovationIds: [scenario.users.johnInnovator.innovations.johnInnovation.id]
          });
        });

        it('should create support log entry for each completed support', async () => {
          //prepare support
          await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { status: status });

          await sut.inactivateUnit(domainContext, unit.id, em);

          expect(supportLogSpy).toHaveBeenCalledWith(
            expect.any(EntityManager),
            { id: domainContext.id, roleId: domainContext.currentRole.id },
            scenario.users.johnInnovator.innovations.johnInnovation.id,
            {
              type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
              supportStatus: InnovationSupportStatusEnum.CLOSED,
              description: 'Unit inactivated',
              unitId: unit.id
            }
          );
        });
      }
    );

    it(`should throw an error if the unit doesn't exist`, async () => {
      await expect(() => sut.inactivateUnit(domainContext, randUuid(), em)).rejects.toThrow(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
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
        domainContext,
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

      await sut.activateUnit(domainContext, organisation.id, unit.id, [scenario.users.bartQualifyingAccessor.id], em);

      const dbOrganisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: organisation.id })
        .getOne();

      expect(dbOrganisation?.inactivatedAt).toBeFalsy();
    });

    it('should unlock all specified users of the unit', async () => {
      await sut.activateUnit(domainContext, organisation.id, unit.id, [userToUnlock.id], em);

      const dbUser = await em
        .createQueryBuilder(UserEntity, 'user')
        .where('user.id = :userId', { userId: userToUnlock.id })
        .getOne();

      expect(dbUser?.lockedAt).toBeFalsy();
      expect(dbUser?.status).toBe(UserStatusEnum.ACTIVE);
    });

    it('should unlock corresponding unit role of all specified users', async () => {
      await sut.activateUnit(domainContext, organisation.id, unit.id, [userToUnlock.id], em);

      const dbUserRole = await em
        .createQueryBuilder(UserRoleEntity, 'userRole')
        .where('userRole.id = :userRoleId', { userRoleId: userToUnlock.roles.qaRole.id })
        .getOne();

      expect(dbUserRole?.isActive).toBeTruthy();
    });

    it(`should throw an error if the unit doesn't exist`, async () => {
      await expect(() =>
        sut.activateUnit(domainContext, organisation.id, randUuid(), [scenario.users.bartQualifyingAccessor.id], em)
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should throw an error if the unit has no active QA', async () => {
      await expect(() =>
        sut.activateUnit(domainContext, organisation.id, unit.id, [scenario.users.adamInnovator.id], em)
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ACTIVATE_NO_QA));
    });
  });

  describe('updateUnit', () => {
    const unit = scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit;

    it('should update the unit name and acronym', async () => {
      const data = {
        name: randCompanyName(),
        acronym: randAlpha({ length: 5 }).join('.')
      };

      const result = await sut.updateUnit(unit.id, data.name, data.acronym, em);

      expect(result).toMatchObject({ id: unit.id });

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: unit.id })
        .getOne();

      expect(dbUnit?.name).toBe(data.name);
      expect(dbUnit?.acronym).toBe(data.acronym);
    });

    it(`should throw an error if the unit doesn't exist`, async () => {
      await expect(() =>
        sut.updateUnit(randUuid(), randCompanyName(), randAlpha({ length: 5 }).join('.'), em)
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should throw an error if the unit name already exists', async () => {
      await expect(() =>
        sut.updateUnit(
          unit.id,
          scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.name,
          randAlpha({ length: 5 }).join('.'),
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS));
    });

    it('should throw an error if the unit acronym already exists', async () => {
      await expect(() =>
        sut.updateUnit(
          unit.id,
          randCompanyName(),
          scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.acronym,
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS));
    });
  });

  describe('updateOrganisation', () => {
    const organisation = scenario.organisations.healthOrg;

    it('should update the organisation name and acronym', async () => {
      const data = {
        name: randCompanyName(),
        acronym: randAlpha({ length: 5 }).join('.'),
        summary: randText(),
        website: randUrl()
      };

      const result = await sut.updateOrganisation(organisation.id, data, em);

      expect(result).toMatchObject({ id: organisation.id });

      const dbOrganisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: organisation.id })
        .getOne();

      expect(dbOrganisation?.name).toBe(data.name);
      expect(dbOrganisation?.acronym).toBe(data.acronym);
    });

    it('should update shadow unit', async () => {
      //prepare shadow unit
      const organisationWithShadow = scenario.organisations.medTechOrg;

      await em
        .getRepository(OrganisationUnitEntity)
        .update({ id: organisationWithShadow.organisationUnits.medTechOrgUnit.id }, { isShadow: true });

      const data = {
        name: randCompanyName(),
        acronym: randAlpha({ length: 5 }).join('.'),
        summary: randText(),
        website: randUrl()
      };

      await sut.updateOrganisation(organisationWithShadow.id, data, em);

      const dbShadowUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: organisationWithShadow.organisationUnits.medTechOrgUnit.id })
        .getOne();

      expect(dbShadowUnit?.name).toBe(data.name);
      expect(dbShadowUnit?.acronym).toBe(data.acronym);
    });

    it(`should throw an error if the organisation doesn't exist`, async () => {
      await expect(() =>
        sut.updateOrganisation(
          randUuid(),
          {
            name: randCompanyName(),
            acronym: randAlpha({ length: 5 }).join('.'),
            summary: randText(),
            website: randUrl()
          },
          em
        )
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND));
    });

    it('should throw an error if the organisation name already exists', async () => {
      await expect(() =>
        sut.updateOrganisation(
          organisation.id,
          {
            name: scenario.organisations.innovTechOrg.name,
            acronym: randAlpha({ length: 5 }).join('.'),
            summary: randText(),
            website: randUrl()
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS));
    });

    it('should throw an error if the organisation acronym already exists', async () => {
      await expect(() =>
        sut.updateOrganisation(
          organisation.id,
          {
            name: randCompanyName(),
            acronym: scenario.organisations.innovTechOrg.acronym || '',
            summary: randText(),
            website: randUrl()
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS));
    });

    it('should not allow changing the NHSE organisation acronym', async () => {
      // Prepare a fake NHSE org in the DB
      const nhseOrg = await sut.createOrganisation(
        domainContext,
        {
          name: 'NHS England',
          acronym: 'NHSE',
          summary: 'NHSE summary',
          website: 'https://nhs.uk'
        },
        em
      );
      const data = {
        name: 'NHS England',
        acronym: 'NEWNHSE', // attempt to change
        summary: 'Updated summary',
        website: 'https://nhs.uk'
      };
      await expect(() => sut.updateOrganisation(nhseOrg.id, data, em)).rejects.toThrow(
        new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_NHSE_ACRONYM_CANNOT_BE_CHANGED, {
          message: 'NHSE acronym cannot be changed'
        })
      );
    });

    it('should allow updating other fields for NHSE organisation if acronym is unchanged', async () => {
      // Prepare a fake NHSE org in the DB
      const nhseOrg = await sut.createOrganisation(
        domainContext,
        {
          name: 'NHS England',
          acronym: 'NHSE',
          summary: 'NHSE summary',
          website: 'https://nhs.uk'
        },
        em
      );
      const data = {
        name: 'NHS England Updated',
        acronym: 'NHSE', // unchanged
        summary: 'Updated summary',
        website: 'https://nhs.uk/updated'
      };
      const result = await sut.updateOrganisation(nhseOrg.id, data, em);
      expect(result).toMatchObject({ id: nhseOrg.id });
      const dbOrganisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: nhseOrg.id })
        .getOne();
      expect(dbOrganisation?.name).toBe(data.name);
      expect(dbOrganisation?.acronym).toBe('NHSE');
    });

    it('should allow changing the acronym for a non-NHSE organisation', async () => {
      const org = await sut.createOrganisation(
        domainContext,
        {
          name: 'Test Org',
          acronym: 'TEST',
          summary: 'Test summary',
          website: 'https://test.org'
        },
        em
      );
      const data = {
        name: 'Test Org',
        acronym: 'NEWTEST',
        summary: 'Test summary',
        website: 'https://test.org'
      };
      const result = await sut.updateOrganisation(org.id, data, em);
      expect(result).toMatchObject({ id: org.id });
      const dbOrganisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: org.id })
        .getOne();
      expect(dbOrganisation?.acronym).toBe('NEWTEST');
    });
  });

  describe('createOrganisation', () => {
    const data = {
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.'),
      summary: randText(),
      website: randUrl()
    };

    it('should create the organisation', async () => {
      const result = await sut.createOrganisation(domainContext, { ...data, units: [] }, em);

      expect(result.id).toBeDefined();

      const dbOrganisation = await em
        .createQueryBuilder(OrganisationEntity, 'organisation')
        .where('organisation.id = :organisationId', { organisationId: result.id })
        .getOne();

      expect(dbOrganisation?.name).toBe(data.name);
      expect(dbOrganisation?.acronym).toBe(data.acronym);
      expect(dbOrganisation?.summary).toBe(data.summary);
    });

    it('should create a shadow unit when no units are specified', async () => {
      const result = await sut.createOrganisation(domainContext, { ...data, units: [] }, em);

      expect(result.units).toHaveLength(1);

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: result.units[0] })
        .getOne();

      expect(dbUnit?.name).toBe(data.name);
      expect(dbUnit?.acronym).toBe(data.acronym);
    });

    it('should create the units when more than 1 unit is specified', async () => {
      const units = [
        {
          name: randCompanyName(),
          acronym: randAlpha({ length: 5 }).join('.')
        },
        {
          name: randCompanyName(),
          acronym: randAlpha({ length: 5 }).join('.')
        }
      ];

      const result = await sut.createOrganisation(domainContext, { ...data, units }, em);

      expect(result.units).toHaveLength(2);

      const dbUnits = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .innerJoin('unit.organisation', 'organisation')
        .where('organisation.id = :organisationId', { organisationId: result.id })
        .getMany();

      expect(dbUnits.map(unit => ({ name: unit.name, acronym: unit.acronym }))).toMatchObject(units);
    });

    it('should ignore the given unit and create a shadow unit when only 1 unit is specified', async () => {
      const result = await sut.createOrganisation(
        domainContext,
        {
          ...data,
          units: [
            {
              name: randCompanyName(),
              acronym: randAlpha({ length: 5 }).join('.')
            }
          ]
        },
        em
      );

      expect(result.units).toHaveLength(1);

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: result.units[0] })
        .getOne();

      expect(dbUnit?.name).toBe(data.name);
      expect(dbUnit?.acronym).toBe(data.acronym);
    });

    it('should throw an error if the organisation name already exists', async () => {
      await expect(() =>
        sut.createOrganisation(domainContext, {
          name: scenario.organisations.medTechOrg.name,
          acronym: randAlpha({ length: 5 }).join('.'),
          summary: randText(),
          website: randUrl(),
          units: []
        })
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS));
    });

    it('should throw an error if the organisation acronym already exists', async () => {
      await expect(() =>
        sut.createOrganisation(domainContext, {
          name: randCompanyName(),
          acronym: scenario.organisations.medTechOrg.acronym || '',
          summary: randText(),
          website: randUrl(),
          units: []
        })
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_ALREADY_EXISTS));
    });
  });

  describe('createUnit', () => {
    const data = {
      name: randCompanyName(),
      acronym: randAlpha({ length: 5 }).join('.')
    };

    it('should create the unit', async () => {
      const result = await sut.createUnit(scenario.organisations.healthOrg.id, data.name, data.acronym, em);

      expect(result.id).toBeDefined();

      const dbUnit = await em
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .where('unit.id = :unitId', { unitId: result.id })
        .getOne();

      expect(dbUnit?.name).toBe(data.name);
      expect(dbUnit?.acronym).toBe(data.acronym);
    });

    it(`should throw an error if the organisation doesn't exist`, async () => {
      await expect(() => sut.createUnit(randUuid(), data.name, data.acronym, em)).rejects.toThrow(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND)
      );
    });

    it('should throw an error if the unit name already exists', async () => {
      await expect(() =>
        sut.createUnit(
          scenario.organisations.healthOrg.id,
          scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.name,
          data.acronym,
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS));
    });

    it('should throw an error if the unit acronym already exists', async () => {
      await expect(() =>
        sut.createUnit(
          scenario.organisations.healthOrg.id,
          data.name,
          scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.acronym,
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_ALREADY_EXISTS));
    });
  });
});
