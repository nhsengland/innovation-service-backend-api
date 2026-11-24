import axios from 'axios';
import { IdentityProviderService } from './identity-provider.service';
jest.mock('../../helpers/misc.helper', () => ({
  ...jest.requireActual('../../helpers/misc.helper'),
  sleep: jest.fn().mockResolvedValue(undefined)
}));
const failure = (status: number): Error =>
  Object.assign(new Error('Graph fixture'), {
    isAxiosError: true,
    response: { status, headers: { 'retry-after': '0' }, data: { error: { message: 'Graph fixture' } } }
  });
describe('B2C extended retry policy', () => {
  let sut: IdentityProviderService;
  beforeEach(() => {
    sut = new IdentityProviderService(
      {
        get: () => ({
          getMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          delete: jest.fn(),
          setMany: jest.fn()
        })
      } as any,
      { log: jest.fn(), error: jest.fn() } as any,
      {} as any
    );
    jest.spyOn<any, any>(sut, 'verifyAccessToken').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  it.each([
    ['interactive', 30],
    ['bulk', 500]
  ] as const)('extends %s reads to %i retries', async (mode, retries) => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ status: 429, headers: { 'retry-after': '0' } });
    for (let i = 0; i < retries; i++) get.mockResolvedValueOnce({ status: 429, headers: { 'retry-after': '0' } });
    get.mockResolvedValueOnce({
      status: 200,
      data: {
        value: [
          {
            id: 'id',
            givenName: 'QA',
            surname: 'Test',
            displayName: 'QA Test',
            identities: [{ signInType: 'emailAddress', issuerAssignedId: 'qa@example.com' }],
            accountEnabled: true
          }
        ]
      }
    });
    await expect(sut.getUsersList(['id'], true, { mode })).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledTimes(retries + 1);
  });
  it('retries acknowledged-safe PATCH throttling past the old limit', async () => {
    const patch = jest.spyOn(axios, 'patch').mockRejectedValue(failure(429));
    for (let i = 0; i < 4; i++) patch.mockRejectedValueOnce(failure(429));
    patch.mockResolvedValueOnce({ status: 204 });
    await expect(sut.updateUser('id', { givenName: 'QA' }, { confirmNames: false })).resolves.toBeUndefined();
    expect(patch).toHaveBeenCalledTimes(5);
  });
  it('does not retry invalid PATCH input', async () => {
    const patch = jest.spyOn(axios, 'patch').mockRejectedValue(failure(400));
    await expect(sut.updateUser('id', { givenName: 'QA' }, { confirmNames: false })).rejects.toThrow();
    expect(patch).toHaveBeenCalledTimes(1);
  });
  it('retries email lookup after Graph503', async () => {
    const get = jest
      .spyOn(axios, 'get')
      .mockRejectedValueOnce(failure(503))
      .mockResolvedValueOnce({ data: { value: [] } });
    await expect(sut.getUserInfoByEmail('qa@example.com')).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('retries creation only after explicit rejection by throttling', async () => {
    const post = jest
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(failure(429))
      .mockResolvedValueOnce({ data: { id: 'new' } });
    await expect(
      sut.createUser({ givenName: 'QA', surname: 'Test', email: 'qa@example.com', password: 'fixture' })
    ).resolves.toBe('new');
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('does not replay creation after an ambiguous upstream500', async () => {
    const post = jest.spyOn(axios, 'post').mockRejectedValue(failure(500));
    await expect(
      sut.createUser({ givenName: 'QA', surname: 'Test', email: 'qa@example.com', password: 'fixture' })
    ).rejects.toThrow();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('accepts404 after retrying an ambiguous deletion', async () => {
    const del = jest.spyOn(axios, 'delete').mockRejectedValueOnce(failure(503)).mockRejectedValueOnce(failure(404));
    await expect(sut.deleteUser('id')).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledTimes(2);
  });
  it('allows confirmation after more than seven stale reads', async () => {
    jest.spyOn(axios, 'patch').mockResolvedValue({ status: 204 });
    const read = jest.spyOn(sut, 'getUserInfo').mockResolvedValue({ isActive: true } as any);
    for (let i = 0; i < 8; i++) read.mockResolvedValueOnce({ isActive: false } as any);
    await expect(sut.updateUser('id', { accountEnabled: true })).resolves.toBeUndefined();
    expect(read).toHaveBeenCalledTimes(9);
  });
  it('ends nested confirmation when the shared200s budget is exhausted', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(axios, 'patch').mockResolvedValue({ status: 204 });
    const read = jest.spyOn(sut, 'getUserInfo').mockImplementation(async () => {
      now += 100000;
      return { isActive: false } as any;
    });
    await expect(sut.updateUser('id', { accountEnabled: true })).rejects.toThrow();
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('stops a permanently throttled direct read after30 retries', async () => {
    const get = jest.spyOn(axios, 'get').mockRejectedValue(failure(429));
    await expect(sut.getUserInfoByEmail('qa@example.com')).rejects.toThrow();
    expect(get).toHaveBeenCalledTimes(31);
  });
  it.each([400, 401, 403, 404])('does not retry permanent read status%i', async status => {
    const get = jest.spyOn(axios, 'get').mockRejectedValue(failure(status));
    await expect(sut.getUserInfoByEmail('qa@example.com')).rejects.toThrow();
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('retries MFA reads while preserving its missing-phone404 contract', async () => {
    const get = jest.spyOn(axios, 'get').mockRejectedValueOnce(failure(429)).mockRejectedValueOnce(failure(404));
    await expect(sut.getMfaPhoneNumber('id')).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('bounds the next HTTP timeout by time consumed by an earlier write', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(axios, 'patch').mockImplementation(async () => {
      now += 190000;
      return { status: 204 } as any;
    });
    const get = jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: {
        value: [
          { id: 'id', givenName: 'QA', surname: 'Test', displayName: 'QA Test', identities: [], accountEnabled: true }
        ]
      }
    });
    await expect(sut.updateUser('id', { accountEnabled: true })).resolves.toBeUndefined();
    expect(get.mock.calls[0][1]?.timeout).toBe(10000);
  });
  it('isolates simultaneous requests retry budgets', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    let release!: (value: any) => void;
    const pending = new Promise(resolve => {
      release = resolve;
    });
    const get = jest
      .spyOn(axios, 'get')
      .mockImplementationOnce(() => pending as any)
      .mockResolvedValue({ data: { value: [] } });
    const first = sut.getUserInfoByEmail('first@example.com');
    await Promise.resolve();
    await Promise.resolve();
    now = 100000;
    await expect(sut.getUserInfoByEmail('second@example.com')).resolves.toBeNull();
    release({ data: { value: [] } });
    await expect(first).resolves.toBeNull();
    expect(get.mock.calls.map(call => call[1]?.timeout)).toEqual([200000, 200000]);
  });
});
