import axios from 'axios';
import { IdentityProviderService } from './identity-provider.service';
import { getRetryAfterMsFromHeaders, getExponentialBackoffMs } from '../../helpers/retry.helper';
import { sleep } from '../../helpers/misc.helper';

jest.mock('../../helpers/misc.helper', () => ({
  ...jest.requireActual('../../helpers/misc.helper'),
  sleep: jest.fn().mockResolvedValue(undefined)
}));

describe('Identity provider reliability (isolated)', () => {
  let sut: IdentityProviderService;
  let cache: any;
  beforeEach(() => {
    cache = {
      getMany: jest.fn().mockResolvedValue([{ identityId: 'id', displayName: 'Stale' }]),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      setMany: jest.fn().mockResolvedValue(undefined)
    };
    sut = new IdentityProviderService(
      { get: () => cache } as any,
      { log: jest.fn(), error: jest.fn() } as any,
      {} as any
    );
    jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
    jest.spyOn(axios, 'patch').mockResolvedValue({ status: 204 });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('bypasses stale Redis values even when invalidation silently fails', async () => {
    jest
      .spyOn<any, any>(sut, 'getUsersListFromB2C')
      .mockResolvedValue({ users: [{ identityId: 'id', displayName: 'Fresh' }], failedIdentityIds: [] });
    expect(await sut.getUsersList(['id'], true)).toEqual([{ identityId: 'id', displayName: 'Fresh' }]);
    expect(cache.getMany).not.toHaveBeenCalled();
  });
  it.each([true, false])('confirms mapped accountEnabled=%s', async accountEnabled => {
    jest.spyOn(sut, 'getUserInfo').mockResolvedValue({ isActive: accountEnabled } as any);
    await expect(sut.updateUser('id', { accountEnabled })).resolves.toBeUndefined();
    expect(sut.getUserInfo).toHaveBeenCalledTimes(1);
  });
  it('allows acknowledged profile names without reading or caching submitted names', async () => {
    const read = jest.spyOn(sut, 'getUserInfo');
    await expect(
      sut.updateUser('id', { givenName: 'New', surname: 'Name', displayName: 'New Name' }, { confirmNames: false })
    ).resolves.toBeUndefined();
    expect(read).not.toHaveBeenCalled();
    expect(cache.delete).toHaveBeenCalledWith('id');
    expect(cache.setMany).not.toHaveBeenCalled();
  });
  it('still confirms account status with optimistic names', async () => {
    jest.spyOn(sut, 'getUserInfo').mockResolvedValue({ isActive: false, givenName: 'Old' } as any);
    await expect(
      sut.updateUser('id', { givenName: 'New', accountEnabled: true }, { confirmNames: false })
    ).rejects.toThrow();
    expect(sut.getUserInfo).toHaveBeenCalledTimes(70);
  });
  it.each([60000, 1, 0])('scales parsed Retry-After %s using ceiling', async retryAfterMs => {
    await (sut as any).waitForB2CRetry({ retryAfterMs, status: 429 }, 0, {
      startedAt: Date.now(),
      policy: { maxRetries: 3, maxDurationMs: 200000 }
    });
    expect(sleep).toHaveBeenCalledWith(Math.ceil(retryAfterMs / 10));
  });
  it('keeps name confirmation as the default for legacy/queued callers', async () => {
    jest.spyOn(sut, 'getUserInfo').mockResolvedValue({ givenName: 'Old' } as any);
    await expect(sut.updateUser('id', { givenName: 'New' })).rejects.toThrow();
    expect(sut.getUserInfo).toHaveBeenCalledTimes(70);
  });
  it('confirms mobile while allowing names to remain stale', async () => {
    jest.spyOn(sut, 'getUserInfo').mockResolvedValue({ givenName: 'Old', mobilePhone: null } as any);
    await expect(
      sut.updateUser('id', { givenName: 'New', mobilePhone: null }, { confirmNames: false })
    ).resolves.toBeUndefined();
    expect(sut.getUserInfo).toHaveBeenCalledTimes(1);
  });
  it('rejects an unconfirmed mobile update with optimistic names', async () => {
    jest.spyOn(sut, 'getUserInfo').mockResolvedValue({ mobilePhone: 'old' } as any);
    await expect(
      sut.updateUser('id', { givenName: 'New', mobilePhone: 'new' }, { confirmNames: false })
    ).rejects.toThrow();
  });
  it('does not mask a rejected Graph PATCH', async () => {
    jest.spyOn(axios, 'patch').mockRejectedValue({ response: { status: 503 } });
    const read = jest.spyOn(sut, 'getUserInfo');
    await expect(sut.updateUser('id', { givenName: 'New' }, { confirmNames: false })).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
  it.each(['60', new Date(Date.now() + 60000).toUTCString(), 'invalid', undefined])(
    'parses and scales header %s or retains fallback backoff',
    async header => {
      const parsed = getRetryAfterMsFromHeaders({ 'Retry-After': header });
      await (sut as any).waitForB2CRetry({ retryAfterMs: parsed, status: 429 }, 0, {
        startedAt: Date.now(),
        policy: { maxRetries: 3 }
      });
      if (parsed !== undefined) expect(sleep).toHaveBeenCalledWith(Math.ceil(parsed / 10));
      else expect(sleep).toHaveBeenCalledWith(getExponentialBackoffMs(1, 15000));
    }
  );
  it('selects the largest subresponse header before scaling, retaining successes', async () => {
    const result = (sut as any).processB2CBatchResponses(
      ['ok', 'a', 'b'],
      [
        { id: 'ok', status: 200, body: { id: 'ok', displayName: 'User' } },
        { id: 'a', status: 429, headers: { 'Retry-After': '10' } },
        { id: 'b', status: 503, headers: { 'Retry-After': '60' } }
      ]
    );
    expect(result.retryAfterMs).toBe(60000);
    expect(result.users).toHaveLength(1);
    expect(result.retryUserIds).toEqual(['a', 'b']);
    await (sut as any).waitForB2CRetry({ retryAfterMs: result.retryAfterMs }, 0, {
      startedAt: Date.now(),
      policy: { maxRetries: 3 }
    });
    expect(sleep).toHaveBeenCalledWith(6000);
  });
  it('retains retry exhaustion and elapsed budget checks', async () => {
    expect(
      await (sut as any).waitForB2CRetry({ retryAfterMs: 60000 }, 3, {
        startedAt: Date.now(),
        policy: { maxRetries: 3 }
      })
    ).toBe(false);
    expect(
      await (sut as any).waitForB2CRetry({ retryAfterMs: 60000 }, 0, {
        startedAt: Date.now() - 200000,
        policy: { maxRetries: 3, maxDurationMs: 200000 }
      })
    ).toBe(false);
    expect(sleep).not.toHaveBeenCalled();
  });
  it.each([true, false])('retries stale account status until accountEnabled=%s is visible', async accountEnabled => {
    jest
      .spyOn(sut, 'getUserInfo')
      .mockResolvedValueOnce({ isActive: !accountEnabled } as any)
      .mockResolvedValueOnce({ isActive: accountEnabled } as any);
    await expect(sut.updateUser('id', { accountEnabled })).resolves.toBeUndefined();
    expect(sut.getUserInfo).toHaveBeenCalledTimes(2);
    expect(cache.delete).toHaveBeenCalledWith('id');
  });
  it('retains the one-hour fallback cap for later bulk retries', async () => {
    const retryState = { startedAt: Date.now(), policy: { maxRetries: 50 } };
    expect(await (sut as any).waitForB2CRetry({ status: 429 }, 11, retryState)).toBe(true);
    expect(sleep).toHaveBeenLastCalledWith(3600000);
    expect(await (sut as any).waitForB2CRetry({ status: 429 }, 49, retryState)).toBe(true);
    expect(sleep).toHaveBeenLastCalledWith(3600000);
    expect(await (sut as any).waitForB2CRetry({ status: 429 }, 50, retryState)).toBe(false);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
