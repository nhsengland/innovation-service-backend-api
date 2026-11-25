import { UsersService } from './users.service';
jest.mock('./base.service', () => ({ BaseService: class {} }));

describe('Profile acknowledgement (isolated)', () => {
  let sut: UsersService;
  let identity: any;
  const previous = { displayName: 'Old Name', givenName: 'Old', surname: 'Name', mobilePhone: null };
  const data = {
    givenName: 'New',
    surname: 'Name',
    displayName: 'ignored',
    howDidYouFindUsAnswers: {},
    jobTitle: 'Job'
  };
  beforeEach(() => {
    identity = {
      getUserInfo: jest.fn().mockResolvedValue(previous),
      updateUser: jest.fn().mockResolvedValue(undefined)
    };
    sut = new UsersService(
      { get: () => ({ delete: jest.fn().mockResolvedValue(undefined) }) } as any,
      identity,
      {} as any,
      {} as any,
      {} as any
    );
    (sut as any).logger = { error: jest.fn() };
  });
  it('opts out of name confirmation only for acknowledged profile updates', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    await expect(
      sut.updateUserInfo({ id: 'user', identityId: 'identity' }, '', data, { getRepository: () => ({ update }) } as any)
    ).resolves.toEqual({ id: 'user' });
    expect(identity.updateUser).toHaveBeenCalledWith(
      'identity',
      { displayName: 'New Name', givenName: 'New', surname: 'Name' },
      { confirmNames: false }
    );
    expect(update).toHaveBeenCalledTimes(1);
  });
  it('compensates Graph after SQL failure without waiting for old names to propagate', async () => {
    const failure = new Error('SQL failed');
    await expect(
      sut.updateUserInfo({ id: 'user', identityId: 'identity' }, '', data, {
        getRepository: () => ({ update: jest.fn().mockRejectedValue(failure) })
      } as any)
    ).rejects.toBe(failure);
    expect(identity.updateUser).toHaveBeenNthCalledWith(2, 'identity', previous, { confirmNames: false });
  });
  it('preserves a real Graph PATCH error and does not attempt SQL', async () => {
    const failure = new Error('Graph rejected write');
    identity.updateUser.mockRejectedValue(failure);
    const sql = jest.fn();
    await expect(
      sut.updateUserInfo({ id: 'user', identityId: 'identity' }, '', data, { getRepository: sql } as any)
    ).rejects.toBe(failure);
    expect(sql).not.toHaveBeenCalled();
    expect(identity.updateUser).toHaveBeenCalledTimes(1);
  });
  it('retains the original SQL error when Graph compensation also fails', async () => {
    const sqlFailure = new Error('SQL failed');
    const rollbackFailure = new Error('Graph rollback failed');
    identity.updateUser.mockResolvedValueOnce(undefined).mockRejectedValueOnce(rollbackFailure);
    await expect(
      sut.updateUserInfo({ id: 'user', identityId: 'identity' }, '', data, {
        getRepository: () => ({ update: jest.fn().mockRejectedValue(sqlFailure) })
      } as any)
    ).rejects.toBe(sqlFailure);
    expect(identity.updateUser).toHaveBeenCalledTimes(2);
    expect((sut as any).logger.error).toHaveBeenCalledWith('Failed to roll back B2C user name update', rollbackFailure);
  });
  it('passes mobile updates while opting out of name confirmation', async () => {
    await expect(
      sut.updateUserInfo({ id: 'user', identityId: 'identity' }, '', { ...data, mobilePhone: '07123456789' }, {
        getRepository: () => ({ update: jest.fn().mockResolvedValue(undefined) })
      } as any)
    ).resolves.toEqual({ id: 'user' });
    expect(identity.updateUser).toHaveBeenCalledWith(
      'identity',
      { displayName: 'New Name', givenName: 'New', surname: 'Name', mobilePhone: '07123456789' },
      { confirmNames: false }
    );
  });
});
