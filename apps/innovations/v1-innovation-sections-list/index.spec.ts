import azureFunction from '.';

import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randNumber, randPastDate, randText, randUuid } from '@ngneat/falso';
import { InnovationSectionsService } from '../_services/innovation-sections.service';
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

const expected = [
  {
    id: randUuid(),
    section: 'INNOVATION_DESCRIPTION' as const,
    status: InnovationSectionStatusEnum.DRAFT,
    submittedAt: randPastDate(),
    submittedBy: {
      name: randText(),
      isOwner: undefined
    },
    openTasksCount: randNumber()
  },
  {
    id: randUuid(),
    section: 'INNOVATION_DESCRIPTION' as const,
    status: InnovationSectionStatusEnum.DRAFT,
    submittedAt: randPastDate(),
    submittedBy: {
      name: randText(),
      isOwner: true
    },
    openTasksCount: randNumber()
  },
  {
    id: randUuid(),
    section: 'INNOVATION_DESCRIPTION' as const,
    status: InnovationSectionStatusEnum.DRAFT,
    submittedAt: null,
    submittedBy: null,
    openTasksCount: randNumber()
  }
];
const mock = jest.spyOn(InnovationSectionsService.prototype, 'getInnovationSectionsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-section-list Suite', () => {
  describe('200', () => {
    it('should return the sections list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody({ description: randText() })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator collaborator', 200, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody({ description: randText() })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
