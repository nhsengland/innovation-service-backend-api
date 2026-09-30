import axios from 'axios';

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
    jest.restoreAllMocks();
  });

  describe('getUsersList', () => {
    it('uses filtered lookup for fourteen uncached identity IDs', async () => {
      const ids = Array.from({ length: 14 }, (_, index) => 'identity-' + index);
      jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
      jest.spyOn(axios, 'post').mockResolvedValue({
        status: 200,
        data: { responses: ids.map(id => ({ id, status: 200, body: { id } })) }
      } as any);
      jest.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { value: ids.map(id => ({ id })) } } as any);
      const post = jest.spyOn(axios, 'post');

      await sut['getUsersListFromB2C'](ids, 'interactive');

      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('$filter=id in'), expect.any(Object));
      expect(post).not.toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/$batch',
        expect.anything(),
        expect.anything()
      );
    });

    it('uses JSON batch for fifteen uncached identity IDs', async () => {
      const ids = Array.from({ length: 15 }, (_, index) => 'identity-' + index);
      jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
      jest.spyOn(axios, 'post').mockResolvedValue({
        status: 200,
        data: { responses: ids.map(id => ({ id, status: 200, body: { id } })) }
      } as any);

      await sut['getUsersListFromB2C'](ids, 'interactive');

      expect(axios.post).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/$batch',
        expect.objectContaining({ requests: expect.any(Array) }),
        expect.any(Object)
      );
    });

    it('skips one failed outer batch and continues with later batches', async () => {
      const firstChunkIds = Array.from({ length: 20 }, (_, index) => `failed-${index}`);
      const secondChunkIds = Array.from({ length: 20 }, (_, index) => `success-${index}`);
      const postBatch = jest
        .spyOn<any, any>(sut, 'postB2CUserBatchWithRetry')
        .mockResolvedValueOnce({ kind: 'skipped', failedIdentityIds: firstChunkIds })
        .mockResolvedValueOnce({
          kind: 'success',
          responses: secondChunkIds.map(id => ({ id, status: 200, body: { id } }))
        });

      const result = await sut['fetchUsersWithJsonBatch']([...firstChunkIds, ...secondChunkIds], {
        policy: { maxRetries: 0 },
        startedAt: Date.now()
      });

      expect(result.users).toHaveLength(20);
      expect(result.failedIdentityIds).toEqual(firstChunkIds);
      expect(postBatch).toHaveBeenCalledTimes(2);
    });

    it('does not error-log one failed outer batch when later batches succeed', async () => {
      const failedChunkIds = Array.from({ length: 20 }, (_, index) => `failed-${index}`);
      const successfulChunkIds = Array.from({ length: 20 }, (_, index) => `success-${index}`);
      const loggerError = jest.spyOn(sut['loggerService'], 'error');
      jest
        .spyOn<any, any>(sut, 'postB2CUserBatch')
        .mockRejectedValueOnce(new Error('temporary outer batch failure'))
        .mockResolvedValueOnce(successfulChunkIds.map(id => ({ id, status: 200, body: { id } })));

      const result = await sut['fetchUsersWithJsonBatch']([...failedChunkIds, ...successfulChunkIds], {
        policy: { maxRetries: 0 },
        startedAt: Date.now()
      });

      expect(result.users).toHaveLength(20);
      expect(result.failedIdentityIds).toEqual(failedChunkIds);
      expect(loggerError).not.toHaveBeenCalled();
    });

    it('error-logs once when every outer batch fails', async () => {
      const ids = Array.from({ length: 40 }, (_, index) => `failed-${index}`);
      const loggerError = jest.spyOn(sut['loggerService'], 'error');
      jest.spyOn<any, any>(sut, 'postB2CUserBatch').mockRejectedValue(new Error('outer batch failure'));

      const result = await sut['fetchUsersWithJsonBatch'](ids, {
        policy: { maxRetries: 0 },
        startedAt: Date.now()
      });

      expect(result.users).toEqual([]);
      expect(result.failedIdentityIds).toEqual(ids);
      expect(loggerError).toHaveBeenCalledTimes(1);
    });

    it('keeps authentication failures as operation failures', async () => {
      const ids = Array.from({ length: 20 }, (_, index) => `identity-${index}`);
      jest
        .spyOn<any, any>(sut, 'postB2CUserBatchWithRetry')
        .mockRejectedValue(new Error('B2C rejected with status 401'));

      await expect(
        sut['fetchUsersWithJsonBatch'](ids, { policy: { maxRetries: 0 }, startedAt: Date.now() })
      ).rejects.toThrow('status 401');
    });

    it('error-logs once for a fatal batch operation failure', async () => {
      const ids = Array.from({ length: 40 }, (_, index) => `identity-${index}`);
      const loggerError = jest.spyOn(sut['loggerService'], 'error');
      jest
        .spyOn<any, any>(sut, 'postB2CUserBatchWithRetry')
        .mockRejectedValue(new Error('B2C rejected with status 401'));

      await expect(
        sut['fetchUsersWithJsonBatch'](ids, { policy: { maxRetries: 0 }, startedAt: Date.now() })
      ).rejects.toThrow('status 401');
      expect(loggerError).toHaveBeenCalledTimes(1);
    });

    it('returns successful users and failed IDs when subrequest retries are exhausted', async () => {
      const ids = ['successful-id', 'failed-id'];
      const loggerError = jest.spyOn(sut['loggerService'], 'error');
      jest.spyOn<any, any>(sut, 'postB2CUserBatchWithRetry').mockResolvedValue({
        kind: 'success',
        responses: [
          { id: 'successful-id', status: 200, body: { id: 'successful-id' } },
          { id: 'failed-id', status: 429, headers: { 'retry-after': '60' } }
        ]
      });

      const result = await sut['fetchUserBatchWithRetry'](ids, { policy: { maxRetries: 0 }, startedAt: Date.now() });

      expect(result.users).toHaveLength(1);
      expect(result.failedIdentityIds).toEqual(['failed-id']);
      expect(loggerError).not.toHaveBeenCalled();
    });

    it('does not error-log when access-token generation fails before resolution', async () => {
      const loggerError = jest.spyOn(sut['loggerService'], 'error');
      sut['sessionData'] = { token: '', expiresAt: 0 };
      jest.spyOn(axios, 'post').mockRejectedValue(new Error('token failure'));

      await expect(sut['getUsersListFromB2C'](['identity-id'], 'interactive')).rejects.toMatchObject({
        name: 'GEN.0003'
      });
      expect(loggerError).not.toHaveBeenCalled();
    });

    it('maps unknown identity-provider errors to identity-provider availability', () => {
      const error = sut['getError'](undefined, 'network failure');

      expect((error as any).details.message).toBe('network failure');
      expect(error.name).toBe('GEN.0003');
    });

    it('maps a network error without an Axios response safely', async () => {
      jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('network failure'));

      await expect(sut.getUserInfoByEmail('user@example.com')).rejects.toMatchObject({ name: 'GEN.0003' });
    });

    it('keeps the public list response and caches only successful users', async () => {
      const successUser = {
        identityId: 'successful-id',
        displayName: 'Successful User',
        email: 'successful@example.com',
        isActive: true
      };
      jest.spyOn(sut['cache'], 'getMany').mockResolvedValue([]);
      const cacheSetMany = jest.spyOn(sut['cache'], 'setMany').mockResolvedValue();
      jest.spyOn<any, any>(sut, 'getUsersListFromB2C').mockResolvedValue({
        users: [successUser],
        failedIdentityIds: ['failed-id']
      });

      const result = await sut.getUsersList(['successful-id', 'failed-id']);

      expect(result).toEqual([successUser]);
      expect(cacheSetMany).toHaveBeenCalledWith([{ key: 'successful-id', value: successUser }]);
    });

    it('uses informational logging for retryable and permanent subresponses', () => {
      const loggerError = jest.spyOn(sut['loggerService'], 'error');
      const loggerLog = jest.spyOn(sut['loggerService'], 'log');

      const result = sut['processB2CBatchResponses'](
        ['retryable-id', 'permanent-id'],
        [
          { id: 'retryable-id', status: 429, headers: { 'retry-after': '60' } },
          { id: 'permanent-id', status: 400, body: { error: { message: 'invalid request' } } }
        ]
      );

      expect(result.retryUserIds).toEqual(['retryable-id']);
      expect(loggerLog).toHaveBeenCalled();
      expect(loggerError).not.toHaveBeenCalled();
      loggerError.mockRestore();
      loggerLog.mockRestore();
    });

    it('should return list of users', async () => {
      const users = [scenario.users.johnInnovator.id, scenario.users.janeInnovator.id];

      const getUsersListFromB2CMock = jest.spyOn<any, any>(sut, 'getUsersListFromB2C').mockResolvedValue({
        users: [
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
        ],
        failedIdentityIds: []
      });

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

      expect(getUsersListFromB2CMock).toHaveBeenCalledWith(users, 'interactive');
    });

    it('should delete cache and retrieve fresh user data', async () => {
      const users = [scenario.users.johnInnovator.id, scenario.users.janeInnovator.id];

      // Mock the cache deleteMany and getMany methods.
      const cacheDeleteManyMock = jest.spyOn(sut['cache'], 'deleteMany').mockResolvedValue();
      const cacheGetManyMock = jest.spyOn(sut['cache'], 'getMany').mockResolvedValue([]);
      const cacheSetManyMock = jest.spyOn(sut['cache'], 'setMany').mockResolvedValue();

      // Mock the method to retrieve fresh users from B2C.
      const getUsersListFromB2CMock = jest.spyOn<any, any>(sut, 'getUsersListFromB2C').mockResolvedValue({
        users: [
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
        ],
        failedIdentityIds: []
      });

      // Call the function with forceRefresh = true
      const result = await sut.getUsersList(users, true);

      // Assertions
      expect(cacheDeleteManyMock).toHaveBeenCalledWith(users); // Cache should be deleted
      expect(cacheGetManyMock).toHaveBeenCalledWith(users); // Cache should be checked
      expect(getUsersListFromB2CMock).toHaveBeenCalledWith(users, 'interactive'); // Fresh users should be fetched from B2C
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

  describe('updateUser', () => {
    it('should invalidate the cached user after updating the identity provider', async () => {
      const identityId = scenario.users.johnInnovator.id;
      const cacheDeleteManyMock = jest.spyOn(sut['cache'], 'deleteMany').mockResolvedValue();
      jest.spyOn(sut['cache'], 'getMany').mockResolvedValue([]);
      jest.spyOn(sut['cache'], 'setMany').mockResolvedValue();
      jest.spyOn<any, any>(sut, 'getUsersListFromB2C').mockResolvedValue({
        users: [
          {
            identityId,
            givenName: 'Updated',
            surname: 'Name',
            displayName: 'Updated Name',
            email: scenario.users.johnInnovator.email,
            isActive: true
          }
        ],
        failedIdentityIds: []
      });
      jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
      jest.spyOn(axios, 'patch').mockResolvedValue({} as any);

      await sut.updateUser(identityId, {
        givenName: 'Updated',
        surname: 'Name',
        displayName: 'Updated Name'
      });

      expect(cacheDeleteManyMock).toHaveBeenCalledWith([identityId]);
    });

    it('returns false when an asynchronous identity operation cannot be queued', async () => {
      jest.spyOn(sut['storageQueueService'], 'sendMessage').mockRejectedValue(new Error('queue unavailable'));

      await expect(sut.updateUserAsync('identity-id', { accountEnabled: false })).resolves.toBe(false);
    });
  });
});
