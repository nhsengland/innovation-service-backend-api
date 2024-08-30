import type { EntityManager } from 'typeorm';

import { TestsHelper } from '@admin/shared/tests';

import { UserEntity, UserRoleEntity } from '@admin/shared/entities';

import { NotifierTypeEnum, ServiceRoleEnum, UserStatusEnum } from '@admin/shared/enums';
import {
  BadRequestError,
  ForbiddenError,
  GenericErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@admin/shared/errors';
import { TranslationHelper } from '@admin/shared/helpers';
import { NotifierService } from '@admin/shared/services';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import { DTOsHelper } from '@admin/shared/tests/helpers/dtos.helper';
import { randEmail, randFullName, randPastDate, randText, randUuid } from '@ngneat/falso';
import { container } from '../_config';
import * as AdminOperationsConfig from '../_config/admin-operations.config';
import SYMBOLS from './symbols';
import { UsersService } from './users.service';

describe('Admin / _services / users service suite', () => {
  let sut: UsersService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<UsersService>(SYMBOLS.UsersService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    notifierSendSpy.mockReset();
  });

  const userAdminContext = DTOsHelper.getUserRequestContext(scenario.users.allMighty);

  describe('updateUser', () => {
    describe('lock/unlock user', () => {
      it('should lock a user', async () => {
        const userInnovator = scenario.users.johnInnovator;

        await sut.updateUser(userAdminContext, userInnovator.id, { accountEnabled: false }, em);

        const updatedUser = await em
          .createQueryBuilder(UserEntity, 'user')
          .where('user.id = :userId', { userId: userInnovator.id })
          .getOne();

        expect(updatedUser?.lockedAt).toBeTruthy();
      });

      it('should unlock a user', async () => {
        const userInnovator = scenario.users.johnInnovator;

        await sut.updateUser(userAdminContext, userInnovator.id, { accountEnabled: true }, em);

        const updatedUser = await em
          .createQueryBuilder(UserEntity, 'user')
          .where('user.id = :userId', { userId: userInnovator.id })
          .getOne();

        expect(updatedUser?.lockedAt).toBeNull();
      });

      it('should send a notification to locked user', async () => {
        const userInnovator = scenario.users.johnInnovator;

        await sut.updateUser(userAdminContext, userInnovator.id, { accountEnabled: false }, em);

        expect(notifierSendSpy).toHaveBeenCalledWith(userAdminContext, NotifierTypeEnum.LOCK_USER, {
          identityId: userInnovator.identityId
        });
      });
    });

    describe('change role of QA/A within organisation', () => {
      it('should update a user role from QA to A', async () => {
        const user = scenario.users.aliceQualifyingAccessor;

        await sut.updateUser(
          userAdminContext,
          user.id,
          {
            role: {
              name: ServiceRoleEnum.ACCESSOR,
              organisationId: user.organisations.healthOrg.id
            }
          },
          em
        );

        const updatedUserRole = await em
          .createQueryBuilder(UserRoleEntity, 'userRole')
          .where('userRole.id = :userRoleId', { userRoleId: user.roles.qaRole.id })
          .getOne();

        expect(updatedUserRole?.role).toBe(ServiceRoleEnum.ACCESSOR);
      });

      it('should update a user role from A to QA', async () => {
        const user = scenario.users.samAccessor;

        await sut.updateUser(
          userAdminContext,
          user.id,
          {
            role: {
              name: ServiceRoleEnum.QUALIFYING_ACCESSOR,
              organisationId: user.organisations.medTechOrg.id
            }
          },
          em
        );

        const updatedUserRole = await em
          .createQueryBuilder(UserRoleEntity, 'userRole')
          .where('userRole.id = :userRoleId', { userRoleId: user.roles.accessorRole.id })
          .getOne();

        expect(updatedUserRole?.role).toBe(ServiceRoleEnum.QUALIFYING_ACCESSOR);
      });

      it('should update a user role of a user with many roles within an organisation', async () => {
        const user = scenario.users.jamieMadroxAccessor;

        await sut.updateUser(
          userAdminContext,
          user.id,
          {
            role: {
              name: ServiceRoleEnum.QUALIFYING_ACCESSOR,
              organisationId: user.organisations.healthOrg.id
            }
          },
          em
        );

        const updatedUserRoles = await em
          .createQueryBuilder(UserRoleEntity, 'userRole')
          .innerJoin('userRole.user', 'user')
          .where('user.id = :userId', { userId: user.id })
          .getMany();

        updatedUserRoles.forEach(role => {
          expect(role?.role).toBe(ServiceRoleEnum.QUALIFYING_ACCESSOR);
        });
      });

      it(`should throw an error if the user role doesn't exist`, async () => {
        await expect(() =>
          sut.updateUser(
            userAdminContext,
            scenario.users.samAccessor.id,
            {
              role: {
                name: ServiceRoleEnum.ACCESSOR,
                organisationId: scenario.organisations.inactiveEmptyOrg.id
              }
            },
            em
          )
        ).rejects.toThrow(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));
      });
    });

    it(`should throw an error if the user doesn't exist`, async () => {
      await expect(() => sut.updateUser(userAdminContext, randUuid(), {}, em)).rejects.toThrow(
        new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND)
      );
    });
  });

  describe('createUser', () => {
    it.each([ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.ADMIN] as const)('should create a %s user', async userType => {
      const result = await sut.createUser(
        userAdminContext,
        {
          name: randFullName(),
          email: randEmail(),
          role: userType
        },
        em
      );

      expect(result.id).toBeDefined();
      const roles = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .where('role.user.id = :userId', { userId: result.id })
        .getMany();
      expect(roles).toHaveLength(1);
      expect(roles[0]?.role).toBe(userType);
    });

    it.each([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR] as const)(
      'should create a %s user',
      async userType => {
        const result = await sut.createUser(
          userAdminContext,
          {
            name: randFullName(),
            email: randEmail(),
            role: userType,
            organisationId: scenario.organisations.healthOrg.id,
            unitIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
          },
          em
        );

        expect(result.id).toBeDefined();
        const roles = await em
          .createQueryBuilder(UserRoleEntity, 'role')
          .where('role.user.id = :userId', { userId: result.id })
          .getMany();
        expect(roles).toHaveLength(1);
        expect(roles[0]).toMatchObject({
          role: userType,
          organisationId: scenario.organisations.healthOrg.id,
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        });
      }
    );

    it.each([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR] as const)(
      'should create a user with %s user with multiple units',
      async userType => {
        const result = await sut.createUser(
          userAdminContext,
          {
            name: randFullName(),
            email: randEmail(),
            role: userType,
            organisationId: scenario.organisations.healthOrg.id,
            unitIds: [
              scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            ]
          },
          em
        );

        expect(result.id).toBeDefined();
        const roles = await em
          .createQueryBuilder(UserRoleEntity, 'role')
          .where('role.user.id = :userId', { userId: result.id })
          .getMany();
        expect(roles).toHaveLength(2);
        expect(roles).toMatchObject([
          {
            role: userType,
            organisationId: scenario.organisations.healthOrg.id,
            organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
          },
          {
            role: userType,
            organisationId: scenario.organisations.healthOrg.id,
            organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
          }
        ]);
      }
    );

    it(`should throw an error if the organisation doesn't exist`, async () => {
      await expect(() =>
        sut.createUser(
          userAdminContext,
          {
            name: randFullName(),
            email: randEmail(),
            role: ServiceRoleEnum.ACCESSOR,
            organisationId: randUuid(),
            unitIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
          },
          em
        )
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it(`should throw an error if the organisation units is empty and role A/QA`, async () => {
      await expect(() =>
        sut.createUser(
          userAdminContext,
          {
            name: randFullName(),
            email: randEmail(),
            role: ServiceRoleEnum.ACCESSOR,
            organisationId: randUuid(),
            unitIds: []
          },
          em
        )
      ).rejects.toThrow(new BadRequestError(UserErrorsEnum.USER_INVALID_ACCESSOR_PARAMETERS));
    });

    it.each([[[randUuid()]], [[scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id, randUuid()]]])(
      `should throw an error if any organisation unit doesn't exist`,
      async unitIds => {
        await expect(() =>
          sut.createUser(
            userAdminContext,
            {
              name: randFullName(),
              email: randEmail(),
              role: ServiceRoleEnum.ACCESSOR,
              organisationId: randUuid(),
              unitIds: unitIds
            },
            em
          )
        ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
      }
    );

    it('should throw an error if the user already exists', async () => {
      await expect(() =>
        sut.createUser(
          userAdminContext,
          {
            name: randFullName(),
            email: scenario.users.adamInnovator.email,
            role: ServiceRoleEnum.ASSESSMENT
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS));
    });
  });

  describe('deleteUser', () => {
    const validationMock = jest.spyOn(AdminOperationsConfig, 'validationsHelper').mockResolvedValue([]);

    beforeEach(() => {
      validationMock.mockClear();
    });

    afterAll(() => {
      validationMock.mockRestore();
    });

    it('should delete a innovator user', async () => {
      const user = scenario.users.johnInnovator;

      await sut.deleteUser(userAdminContext, user.id, em);

      const deletedUser = await em
        .createQueryBuilder(UserEntity, 'user')
        .where('user.id = :userId', { userId: user.id })
        .getOne();

      expect(deletedUser?.status).toBe(UserStatusEnum.DELETED);
    });

    it('should throw an error if the user does not exist', async () => {
      await expect(sut.deleteUser(userAdminContext, randUuid(), em)).rejects.toThrow(
        new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND)
      );
    });

    it("should throw an error if user can't be deleted", async () => {
      validationMock.mockResolvedValueOnce([{ valid: false, rule: 'test' as any }]);

      await expect(sut.deleteUser(userAdminContext, scenario.users.aliceQualifyingAccessor.id, em)).rejects.toThrow(
        new BadRequestError(UserErrorsEnum.USER_CANNOT_BE_DELETED)
      );
    });

    it('should throw an error if the request user is not admin', async () => {
      await expect(
        sut.deleteUser(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), em)
      ).rejects.toThrow(new ForbiddenError(GenericErrorsEnum.FORBIDDEN_ERROR));
    });
  });

  describe('getUserInfo()', () => {
    const johnInnovator = scenario.users.johnInnovator;
    const jamieMadroxAccessor = scenario.users.jamieMadroxAccessor;
    const allMighty = scenario.users.allMighty;
    const paulNeedsAssessor = scenario.users.paulNeedsAssessor;

    it.each([
      ['id', johnInnovator.id, johnInnovator],
      ['email', johnInnovator.email, johnInnovator],
      ['id', jamieMadroxAccessor.id, jamieMadroxAccessor],
      ['email', jamieMadroxAccessor.email, jamieMadroxAccessor],
      ['id', allMighty.id, allMighty],
      ['id', paulNeedsAssessor.id, paulNeedsAssessor]
    ])('should return user info by %s', async (_type: string, id: string, scenarioUser: TestUserType) => {
      const user = await sut.getUserInfo(id, em);

      expect(user).toMatchObject({
        id: scenarioUser.id,
        email: scenarioUser.email,
        name: scenarioUser.name,
        phone: scenarioUser.mobilePhone ?? undefined,
        isActive: scenarioUser.isActive,
        roles: Object.values(scenarioUser.roles).map(r => ({
          id: r.id,
          role: r.role,
          ...(r.role === ServiceRoleEnum.ACCESSOR || r.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
            ? { displayTeam: r.organisationUnit?.name }
            : undefined),
          ...(r.role === ServiceRoleEnum.ADMIN || r.role === ServiceRoleEnum.ASSESSMENT
            ? { displayTeam: TranslationHelper.translate(`TEAMS.${r.role}`) }
            : undefined),
          isActive: r.isActive
        }))
      });
    });
  });

  describe('addRoles', () => {
    const validationMock = jest.spyOn(AdminOperationsConfig, 'validationsHelper').mockResolvedValue([]);

    beforeEach(() => {
      validationMock.mockClear();
    });

    afterAll(() => {
      validationMock.mockRestore();
    });

    it('should add one role if assessment', async () => {
      const res = await sut.addRoles(
        userAdminContext,
        scenario.users.aliceQualifyingAccessor.id,
        {
          role: ServiceRoleEnum.ASSESSMENT
        },
        em
      );

      expect(res.length).toBe(1);
    });

    it('should add one role if accessor with one unit', async () => {
      const res = await sut.addRoles(
        userAdminContext,
        scenario.users.paulNeedsAssessor.id,
        {
          role: ServiceRoleEnum.ACCESSOR,
          organisationId: scenario.organisations.healthOrg.id,
          unitIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
        },
        em
      );

      expect(res.length).toBe(1);
    });

    it('should add multiple roles if accessor with multiple units', async () => {
      const res = await sut.addRoles(
        userAdminContext,
        scenario.users.paulNeedsAssessor.id,
        {
          role: ServiceRoleEnum.ACCESSOR,
          organisationId: scenario.organisations.healthOrg.id,
          unitIds: [
            scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
          ]
        },
        em
      );

      expect(res.length).toBe(2);
    });

    it('should throw error if validation fails', async () => {
      validationMock.mockResolvedValueOnce([{ valid: false, rule: 'test' as any }]); // TODO fix once we have the right rule
      await expect(() =>
        sut.addRoles(
          userAdminContext,
          scenario.users.johnInnovator.id,
          {
            role: ServiceRoleEnum.ACCESSOR,
            organisationId: scenario.organisations.healthOrg.id,
            unitIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
          },
          em
        )
      ).rejects.toThrow(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
    });
  });

  describe('addRole()', () => {
    const aliceQualifyingAccessor = scenario.users.aliceQualifyingAccessor;
    const ingridAccessor = scenario.users.ingridAccessor;

    it.each([
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, aliceQualifyingAccessor],
      [ServiceRoleEnum.ACCESSOR, ingridAccessor]
    ])('should create a %s role to an existing user', async (userRole: any, user: TestUserType) => {
      const healthOrg = scenario.organisations.healthOrg;

      const role = await sut.addDbRole(
        userAdminContext,
        user.id,
        {
          role: userRole,
          orgId: healthOrg.id,
          unitId: healthOrg.organisationUnits.healthOrgAiUnit.id
        },
        em
      );

      const dbRole = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .innerJoinAndSelect('role.user', 'user')
        .where('role.id = :roleId', { roleId: role.id })
        .getOneOrFail();

      expect(dbRole).toMatchObject({
        role: userRole,
        organisationId: healthOrg.id,
        organisationUnitId: healthOrg.organisationUnits.healthOrgAiUnit.id,
        user: { id: user.id },
        createdBy: userAdminContext.id,
        updatedBy: userAdminContext.id
      });
    });

    it.each([
      [ServiceRoleEnum.ADMIN],
      [ServiceRoleEnum.ASSESSMENT],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR],
      [ServiceRoleEnum.ACCESSOR]
    ])('should create a %s role to a new user', async (userRole: any) => {
      const user = await em.getRepository(UserEntity).save({
        firstTimeSignInAt: randPastDate(),
        identityId: randUuid(),
        serviceRoles: [],
        status: UserStatusEnum.ACTIVE,
        name: randText()
      });
      const healthOrg = scenario.organisations.healthOrg;
      const isAccessor = userRole === ServiceRoleEnum.QUALIFYING_ACCESSOR || userRole === ServiceRoleEnum.ACCESSOR;

      const role = await sut.addDbRole(
        userAdminContext,
        user.id,
        {
          role: userRole,
          ...(isAccessor
            ? {
                orgId: healthOrg.id,
                unitId: healthOrg.organisationUnits.healthOrgAiUnit.id
              }
            : {})
        },
        em
      );

      const dbRole = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .select(['role', 'user.id'])
        .innerJoin('role.user', 'user')
        .where('role.id = :roleId', { roleId: role.id })
        .getOneOrFail();

      expect(dbRole).toMatchObject({
        role: userRole,
        organisationId: isAccessor ? healthOrg.id : null,
        organisationUnitId: isAccessor ? healthOrg.organisationUnits.healthOrgAiUnit.id : null,
        user: { id: user.id },
        createdBy: userAdminContext.id,
        updatedBy: userAdminContext.id
      });
    });

    it("should return NotFoundError if unit doesn't exist", async () => {
      await expect(() =>
        sut.addDbRole(
          userAdminContext,
          aliceQualifyingAccessor.id,
          { role: ServiceRoleEnum.ACCESSOR, orgId: randUuid(), unitId: randUuid() },
          em
        )
      ).rejects.toThrow(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });
  });

  describe('updateUserRole', () => {
    let enableRoleSpy: jest.SpyInstance;
    let disableRoleSpy: jest.SpyInstance;
    beforeAll(() => {
      enableRoleSpy = jest.spyOn(UsersService.prototype, 'enableRole').mockResolvedValue();
      disableRoleSpy = jest.spyOn(UsersService.prototype, 'disableRole').mockResolvedValue();
    });

    beforeEach(() => {
      enableRoleSpy.mockClear();
      disableRoleSpy.mockClear();
    });

    afterAll(() => {
      enableRoleSpy.mockRestore();
      disableRoleSpy.mockRestore();
    });

    describe('enable', () => {
      it('should enable user if enabled is true', async () => {
        await sut.updateUserRole(userAdminContext, randUuid(), randUuid(), { enabled: true }, em);
        expect(enableRoleSpy).toHaveBeenCalledTimes(1);
        expect(disableRoleSpy).toHaveBeenCalledTimes(0);
      });

      it('should disable user if enabled is false', async () => {
        await sut.updateUserRole(userAdminContext, randUuid(), randUuid(), { enabled: false }, em);
        expect(enableRoleSpy).toHaveBeenCalledTimes(0);
        expect(disableRoleSpy).toHaveBeenCalledTimes(1);
      });

      it("shouldn't do anything if enable is undefined", async () => {
        await sut.updateUserRole(userAdminContext, randUuid(), randUuid(), {}, em);
        expect(enableRoleSpy).toHaveBeenCalledTimes(0);
        expect(disableRoleSpy).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('enableRole', () => {
    const user = scenario.users.aliceQualifyingAccessor;
    it('should enable the role', async () => {
      await em.update(UserRoleEntity, user.roles.qaRole.id, { isActive: false });
      await sut.enableRole(userAdminContext, user.id, user.roles.qaRole.id, em);
      const role = await em.getRepository(UserRoleEntity).findOneByOrFail({ id: user.roles.qaRole.id });
      expect(role.isActive).toBe(true);
    });

    it('should enable the user if he was disabled', async () => {
      await em.update(UserRoleEntity, user.roles.qaRole.id, { isActive: false });
      await em.update(UserEntity, user.id, {
        lockedAt: new Date(),
        status: UserStatusEnum.LOCKED
      });
      await sut.enableRole(userAdminContext, user.id, user.roles.qaRole.id, em);
      const role = await em.getRepository(UserRoleEntity).findOneByOrFail({ id: user.roles.qaRole.id });
      const userDb = await em.getRepository(UserEntity).findOneByOrFail({ id: user.id });
      expect(role.isActive).toBe(true);
      expect(userDb.lockedAt).toBeNull();
      expect(userDb.status).toBe(UserStatusEnum.ACTIVE);
    });
  });

  describe('disableRole', () => {
    const user = scenario.users.jamieMadroxAccessor;
    it('should disable the role', async () => {
      await sut.disableRole(userAdminContext, user.id, user.roles.aiRole.id, em);
      const role = await em.getRepository(UserRoleEntity).findOneByOrFail({ id: user.roles.aiRole.id });
      expect(role.isActive).toBe(false);
    });

    it('should lock the user if it was the last active role', async () => {
      await em.update(UserRoleEntity, user.roles.healthAccessorRole.id, {
        isActive: false
      });
      await sut.disableRole(userAdminContext, user.id, user.roles.aiRole.id, em);
      const role = await em.getRepository(UserRoleEntity).findOneByOrFail({ id: user.roles.aiRole.id });
      const userDb = await em.getRepository(UserEntity).findOneByOrFail({ id: user.id });
      expect(role.isActive).toBe(false);
      expect(userDb.lockedAt).toBeDefined();
      expect(userDb.status).toBe(UserStatusEnum.LOCKED);
    });
  });
});
