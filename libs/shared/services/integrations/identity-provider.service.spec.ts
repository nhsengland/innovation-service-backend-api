//import type { EntityManager } from 'typeorm';
import SHARED_SYMBOLS from '../symbols';
import type { IdentityProviderService } from './identity-provider.service';
import { container } from '../../config/inversify.config';
import { TestsHelper } from '../../tests';

describe('Shared / services / IdentityProviderService', () => {
  let sut: IdentityProviderService;
  const testsHelper = new TestsHelper({ mockFunctions: false });
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
    sut = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('getUsersList', () => {
    it('should return list of users', async () => {
      const users = [scenario.users.johnInnovator.id, scenario.users.janeInnovator.id];

      const getUsersListFromB2CMock = jest.spyOn<any, any>(sut, 'getUsersListFromB2C').mockResolvedValue([
        {
          identityId: scenario.users.johnInnovator.id,
          displayName: scenario.users.johnInnovator.name,
          email: scenario.users.johnInnovator.email,
          isActive: true
        },
        {
          identityId: scenario.users.janeInnovator.id,
          displayName: scenario.users.janeInnovator.name,
          email: scenario.users.janeInnovator.email,
          isActive: true
        }
      ]);

      const result = await sut.getUsersList(users, false);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          identityId: scenario.users.johnInnovator.id,
          displayName: scenario.users.johnInnovator.name,
          email: scenario.users.johnInnovator.email,
          isActive: true
        },
        {
          identityId: scenario.users.janeInnovator.id,
          displayName: scenario.users.janeInnovator.name,
          email: scenario.users.janeInnovator.email,
          isActive: true
        }
      ]);

      expect(getUsersListFromB2CMock).toHaveBeenCalledWith(users);
    });

    it('should delete cache and retrieve fresh user data', async () => {
      const users = [scenario.users.johnInnovator.id, scenario.users.janeInnovator.id];

      // Mock the cache deleteMany and getMany methods.
      const cacheDeleteManyMock = jest.spyOn(sut['cache'], 'deleteMany').mockResolvedValue();
      const cacheGetManyMock = jest.spyOn(sut['cache'], 'getMany').mockResolvedValue([]);
      const cacheSetManyMock = jest.spyOn(sut['cache'], 'setMany').mockResolvedValue();

      // Mock the method to retrieve fresh users from B2C.
      const getUsersListFromB2CMock = jest.spyOn<any, any>(sut, 'getUsersListFromB2C').mockResolvedValue([
        {
          identityId: scenario.users.johnInnovator.id,
          displayName: scenario.users.johnInnovator.name,
          email: scenario.users.johnInnovator.email,
          isActive: true
        },
        {
          identityId: scenario.users.janeInnovator.id,
          displayName: scenario.users.janeInnovator.name,
          email: scenario.users.janeInnovator.email,
          isActive: true
        }
      ]);

      // Call the function with forceRefresh = true
      const result = await sut.getUsersList(users, true);

      // Assertions
      expect(cacheDeleteManyMock).toHaveBeenCalledWith(users); // Cache should be deleted
      expect(cacheGetManyMock).toHaveBeenCalledWith(users); // Cache should be checked
      expect(getUsersListFromB2CMock).toHaveBeenCalledWith(users); // Fresh users should be fetched from B2C
      expect(cacheSetManyMock).toHaveBeenCalled(); // New users should be set in cache

      expect(result).toEqual([
        {
          identityId: scenario.users.johnInnovator.id,
          displayName: scenario.users.johnInnovator.name,
          email: scenario.users.johnInnovator.email,
          isActive: true
        },
        {
          identityId: scenario.users.janeInnovator.id,
          displayName: scenario.users.janeInnovator.name,
          email: scenario.users.janeInnovator.email,
          isActive: true
        }
      ]);
    });
  });
});
