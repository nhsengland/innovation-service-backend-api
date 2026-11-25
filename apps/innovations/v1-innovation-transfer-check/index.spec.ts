import azureFunction from '.';

import { InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randBoolean, randUuid } from '@ngneat/falso';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
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

const expected = { userExists: randBoolean() };

const mock = jest
  .spyOn(InnovationTransferService.prototype, 'getPendingInnovationTransferInfo')
  .mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-transfer-check Suite', () => {
  describe('200', () => {
    it('should return the transfer check', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ transferId: randUuid() })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('404', () => {
    it('should return 404 when the transfer does not exist', async () => {
      mock.mockRejectedValueOnce(new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND));
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ transferId: randUuid() })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(404);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([['Anyone', 200, scenario.users.allMighty]])(
      'access with user %s should give %i',
      async (_role: string, status: number, user: TestUserType) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user)
          .setParams<ParamsType>({ transferId: randUuid() })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(status);
      }
    );
  });
});
