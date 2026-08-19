import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { BadRequestError, GenericErrorsEnum, NotFoundError, UserErrorsEnum } from '@users/shared/errors';
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
