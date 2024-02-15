import azureFunction from '.';

import { randText } from '@ngneat/falso';
import { NotFoundError, UserErrorsEnum } from '@users/shared/errors';
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

const mock = jest.spyOn(UsersService.prototype, 'deleteUser').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-delete Suite', () => {
  describe('204', () => {
    it('should delete the user', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setBody({ reason: randText() })
        .call<never>(azureFunction);

      expect(result.status).toBe(204);
      expect(result.body).toBeUndefined();
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('404', () => {
    it('should return not found if the user is not found', async () => {
      mock.mockRejectedValueOnce(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));
      const res = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setBody({ reason: randText() })
        .call<ErrorResponseType>(azureFunction);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe(UserErrorsEnum.USER_SQL_NOT_FOUND);
    });
  });
});
