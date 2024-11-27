import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { container } from '../../config/inversify.config';
import { ServiceRoleEnum } from '../../enums';
import { NotFoundError, UserErrorsEnum } from '../../errors';
import { TestsHelper } from '../../tests';
import SHARED_SYMBOLS from '../symbols';
import { DomainUsersService } from './domain-users.service';
import type { DomainService } from './domain.service';

describe('Shared / services / domain user suite', () => {
  let sut: DomainUsersService;
  const testsHelper = new TestsHelper();
  let em: EntityManager;
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
    sut = container.get<DomainService>(SHARED_SYMBOLS.DomainService).users;
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    jest.clearAllMocks();
  });

  describe('getDisplayName', () => {
    it('should return the user displayName by userId', async () => {
      const result = await sut.getDisplayName({ userId: scenario.users.johnInnovator.id });
      expect(result).toBe(scenario.users.johnInnovator.name);
    });

    it('should return the user displayName by identityId', async () => {
      const result = await sut.getDisplayName({ identityId: scenario.users.johnInnovator.identityId });
      expect(result).toBe(scenario.users.johnInnovator.name);
    });

    it('should return [deleted user] when user is not found', async () => {
      const result = await sut.getDisplayName({ userId: randUuid() });
      expect(result).toBe('[deleted user]');
    });

    it('should return role + [deleted user] when user is not found and role provided', async () => {
      const result = await sut.getDisplayName({ userId: randUuid() }, ServiceRoleEnum.INNOVATOR, em);
      expect(result).toBe('Innovator [deleted user]');
    });
  });

  describe('getIdentityUserInfo', () => {
    it('should return the user info by userId', async () => {
      const result = await sut.getIdentityUserInfo({ userId: scenario.users.johnInnovator.id });
      expect(result).toMatchObject({
        id: scenario.users.johnInnovator.id,
        identityId: scenario.users.johnInnovator.identityId,
        displayName: scenario.users.johnInnovator.name,
        email: scenario.users.johnInnovator.email,
        roles: [
          {
            id: scenario.users.johnInnovator.roles.innovatorRole.id,
            isActive: scenario.users.johnInnovator.roles.innovatorRole.isActive,
            role: scenario.users.johnInnovator.roles.innovatorRole.role
          }
        ],
        isActive: scenario.users.johnInnovator.isActive,
        mobilePhone: scenario.users.johnInnovator.mobilePhone
      });
    });

    it('should return the user info by identityId', async () => {
      const result = await sut.getIdentityUserInfo({ identityId: scenario.users.johnInnovator.identityId });
      expect(result).toMatchObject({
        id: scenario.users.johnInnovator.id,
        identityId: scenario.users.johnInnovator.identityId,
        displayName: scenario.users.johnInnovator.name,
        email: scenario.users.johnInnovator.email,
        roles: [
          {
            id: scenario.users.johnInnovator.roles.innovatorRole.id,
            isActive: scenario.users.johnInnovator.roles.innovatorRole.isActive,
            role: scenario.users.johnInnovator.roles.innovatorRole.role
          }
        ],
        isActive: scenario.users.johnInnovator.isActive,
        mobilePhone: scenario.users.johnInnovator.mobilePhone
      });
    });

    it('should throw error if user not found', async () => {
      await expect(sut.getIdentityUserInfo({ userId: randUuid() })).rejects.toThrow(
        new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND)
      );
    });
  });
});
