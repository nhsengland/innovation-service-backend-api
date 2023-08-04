import azureFunction from '.';

import { randText, randUuid } from '@ngneat/falso';
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
          displayName: randText()
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
            displayName: randText()
          },
          identityId: randUuid()
        }
      })
    ).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND));
  });

  it('should throw error on invalid payload', async () => {
    await expect(azureFunction(context, {} as any)).rejects.toThrowError(
      new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD)
    );
  });
});
