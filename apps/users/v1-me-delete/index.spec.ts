import azureFunction from '.';

import { randUuid } from '@ngneat/falso';
import { NotFoundError, UserErrorsEnum } from '@users/shared/errors';
import { DomainUsersService } from '@users/shared/services';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { ErrorResponseType } from '@users/shared/types';

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
const mock = jest.spyOn(DomainUsersService.prototype, 'deleteUser').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-delete Suite', () => {
  describe('200', () => {
    it('should delete the user', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('404', () => {
    it('should return not found if the user is not found', async () => {
      mock.mockRejectedValueOnce(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));
      const res = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ErrorResponseType>(azureFunction);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe(UserErrorsEnum.USER_SQL_NOT_FOUND);
    });
  });
});
