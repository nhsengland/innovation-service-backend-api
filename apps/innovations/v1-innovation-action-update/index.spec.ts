import { InnovationActionStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randUuid } from '@ngneat/falso';
import { default as v1InnovationActionUpdate } from '.';
import { InnovationActionsService } from '../_services/innovation-actions.service';
import type { ResponseDTO } from './transformation.dtos';
import type { BodyType, ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const expected = { id: randUuid() };
const updateActionAccessor = jest
  .spyOn(InnovationActionsService.prototype, 'updateActionAsAccessor')
  .mockResolvedValue(expected);
const updateActionNA = jest
  .spyOn(InnovationActionsService.prototype, 'updateActionAsNeedsAccessor')
  .mockResolvedValue(expected);
const updateActionInnovator = jest
  .spyOn(InnovationActionsService.prototype, 'updateActionAsInnovator')
  .mockResolvedValue(expected);
const mocks = [updateActionAccessor, updateActionNA, updateActionInnovator];

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-action-update Suite', () => {
  describe('200', () => {
    it.each([
      ['ACCESSOR', scenario.users.ingridAccessor, updateActionAccessor],
      ['QUALIFYING_ACCESSOR', scenario.users.aliceQualifyingAccessor, updateActionAccessor],
      ['NEEDS_ASSESSOR', scenario.users.paulNeedsAssessor, updateActionNA],
      ['INNOVATOR', scenario.users.johnInnovator, updateActionInnovator]
    ])('should update an action as %s', async (_label, user, mock) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          actionId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationActionStatusEnum.REQUESTED })
        .call<ResponseDTO>(v1InnovationActionUpdate);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
      for (const otherMock of mocks.filter(m => m !== mock)) {
        expect(otherMock).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          actionId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationActionStatusEnum.REQUESTED })
        .call<ErrorResponseType>(v1InnovationActionUpdate);

      expect(result.status).toBe(status);
    });
  });
});
