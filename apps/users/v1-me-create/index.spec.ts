import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { ErrorResponseType } from '@users/shared/types';
import { UsersService } from '../_services/users.service';

jest.mock('@users/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const expected = { id: randUuid() };
const mock = jest.spyOn(UsersService.prototype, 'createUserInnovator').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-create Suite', () => {
  describe('200', () => {
    it('should create the user', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('422', () => {
    it('should return unprocessable if the user already exists', async () => {
      mock.mockRejectedValueOnce(new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS));
      const res = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ErrorResponseType>(azureFunction);
      expect(res.status).toBe(422);
      expect(res.body.error).toBe(UserErrorsEnum.USER_ALREADY_EXISTS);
    });
  });
});
