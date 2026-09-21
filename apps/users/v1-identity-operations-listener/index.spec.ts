import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { BadRequestError, GenericErrorsEnum, NotFoundError, UserErrorsEnum } from '@users/shared/errors';
import { IdentityProviderService } from '@users/shared/services';
import { MocksHelper, TestsHelper } from '@users/shared/tests';

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const context = MocksHelper.mockContext();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-identity-operations-listener', () => {
  it('should update user identity', async () => {
    await azureFunction(context, {
      data: {
        body: {
          accountEnabled: true,
          givenName: 'Ada',
          surname: 'Lovelace',
          displayName: 'Ada Lovelace'
        },
        identityId: scenario.users.johnInnovator.identityId
      }
    });
    expect(context.res).toEqual({ done: true });
  });

  it('should merge a given-name-only update and synchronize displayName', async () => {
    const identityId = scenario.users.johnInnovator.identityId;
    const getUserInfoSpy = jest.spyOn(IdentityProviderService.prototype, 'getUserInfo');
    const updateUserSpy = jest.spyOn(IdentityProviderService.prototype, 'updateUser');

    getUserInfoSpy.mockResolvedValueOnce({ givenName: 'John', surname: 'Smith' } as any);
    updateUserSpy.mockResolvedValueOnce();

    await azureFunction(context, {
      data: {
        body: { givenName: 'Jonathan' },
        identityId
      }
    });

    expect(getUserInfoSpy).toHaveBeenCalledWith(identityId, true);
    expect(updateUserSpy).toHaveBeenCalledWith(identityId, {
      givenName: 'Jonathan',
      surname: 'Smith',
      displayName: 'Jonathan Smith'
    });
  });

  it('should merge a surname-only update and synchronize displayName', async () => {
    const identityId = scenario.users.johnInnovator.identityId;
    const getUserInfoSpy = jest.spyOn(IdentityProviderService.prototype, 'getUserInfo');
    const updateUserSpy = jest.spyOn(IdentityProviderService.prototype, 'updateUser');

    getUserInfoSpy.mockResolvedValueOnce({ givenName: 'Jonathan', surname: 'Smith' } as any);
    updateUserSpy.mockResolvedValueOnce();

    await azureFunction(context, {
      data: {
        body: { surname: 'Smythe' },
        identityId
      }
    });

    expect(updateUserSpy).toHaveBeenCalledWith(identityId, {
      surname: 'Smythe',
      givenName: 'Jonathan',
      displayName: 'Jonathan Smythe'
    });
  });

  it('should derive displayName from split names when a queued displayName is stale', async () => {
    const identityId = scenario.users.johnInnovator.identityId;
    const getUserInfoSpy = jest.spyOn(IdentityProviderService.prototype, 'getUserInfo');
    const updateUserSpy = jest.spyOn(IdentityProviderService.prototype, 'updateUser');

    getUserInfoSpy.mockResolvedValueOnce({ givenName: 'John', surname: 'Smith' } as any);
    updateUserSpy.mockResolvedValueOnce();

    await azureFunction(context, {
      data: {
        body: { givenName: 'Jonathan', surname: 'Smythe', displayName: 'John Smith' },
        identityId
      }
    });

    expect(updateUserSpy).toHaveBeenCalledWith(identityId, {
      givenName: 'Jonathan',
      surname: 'Smythe',
      displayName: 'Jonathan Smythe'
    });
  });

  it('should forward an account-only update without fetching identity names', async () => {
    const identityId = scenario.users.johnInnovator.identityId;
    const getUserInfoSpy = jest.spyOn(IdentityProviderService.prototype, 'getUserInfo');
    const updateUserSpy = jest.spyOn(IdentityProviderService.prototype, 'updateUser');

    updateUserSpy.mockResolvedValueOnce();

    await azureFunction(context, {
      data: {
        body: { accountEnabled: false },
        identityId
      }
    });

    expect(getUserInfoSpy).not.toHaveBeenCalled();
    expect(updateUserSpy).toHaveBeenCalledWith(identityId, { accountEnabled: false });
  });

  it('should throw error on invalid identityId', async () => {
    await expect(
      azureFunction(context, {
        data: {
          body: {
            accountEnabled: true,
            givenName: 'Ada',
            surname: 'Lovelace',
            displayName: 'Ada Lovelace'
          },
          identityId: randUuid()
        }
      })
    ).rejects.toThrow(new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND));
  });

  it('should throw error on invalid payload', async () => {
    await expect(azureFunction(context, {} as any)).rejects.toThrow(
      new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD)
    );
  });

  it.each([
    { givenName: '   ', surname: 'Lovelace' },
    { givenName: 'A'.repeat(65), surname: 'Lovelace' }
  ])('should reject invalid queued names', async names => {
    await expect(
      azureFunction(context, {
        data: {
          body: names,
          identityId: scenario.users.johnInnovator.identityId
        }
      })
    ).rejects.toThrow();
  });
});
