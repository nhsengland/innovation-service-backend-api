import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import v1InnovationAllSectionsList from '.';
import { InnovationSectionsService } from '../_services/innovation-sections.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

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

const expected: Awaited<ReturnType<InnovationSectionsService['findAllSections']>> = [
  {
    section: {
      section: 'INNOVATION_DESCRIPTION',
      openTasksCount: 0,
      status: InnovationSectionStatusEnum.DRAFT
    },
    data: { description: 'test description' }
  }
];
const mock = jest.spyOn(InnovationSectionsService.prototype, 'findAllSections').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-all-sections-list Suite', () => {
  describe('200', () => {
    it('should return the sections list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ResponseDTO>(v1InnovationAllSectionsList);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
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
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ErrorResponseType>(v1InnovationAllSectionsList);

      expect(result.status).toBe(status);
    });
  });
});
