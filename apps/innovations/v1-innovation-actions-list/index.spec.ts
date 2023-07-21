import { InnovationActionStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randFullName, randNumber, randText, randUuid } from '@ngneat/falso';
import v1InnovationActionsList from '.';
import { InnovationActionsService } from '../_services/innovation-actions.service';
import type { ResponseDTO } from './transformation.dtos';

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

const expected = {
  count: 2,
  data: [
    {
      id: randUuid(),
      displayId: randText(),
      description: randText(),
      innovation: { id: randText(), name: randText() },
      status: InnovationActionStatusEnum.COMPLETED,
      section: 'INNOVATION_DESCRIPTION' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: { name: randFullName() },
      createdBy: {
        id: randUuid(),
        name: randFullName()
      },
      notifications: randNumber()
    },
    {
      id: randUuid(),
      displayId: randText(),
      description: randText(),
      innovation: { id: randText(), name: randText() },
      status: InnovationActionStatusEnum.COMPLETED,
      section: 'INNOVATION_DESCRIPTION' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: { name: randFullName() },
      createdBy: {
        id: randUuid(),
        name: randFullName()
      }
    }
  ]
};
const mock = jest.spyOn(InnovationActionsService.prototype, 'getActionsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-action-list Suite', () => {
  describe('200', () => {
    it('should return the actions list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .call<ResponseDTO>(v1InnovationActionsList);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('500', () => {
    // Require to test the error handler since access is successful for all
    it('should return 500 when an unepected error occurs', async () => {
      mock.mockRejectedValueOnce(new Error('test error'));
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .call<ResponseDTO>(v1InnovationActionsList);

      expect(result.status).toBe(500);
      expect(result.body).toMatchObject({ message: 'Unknown error.' });
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(v1InnovationActionsList);

      expect(result.status).toBe(status);
    });
  });
});
