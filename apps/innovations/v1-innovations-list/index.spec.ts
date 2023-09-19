import azureFunction from '.';

import {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum
} from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import {
  randAbbreviation,
  randCompanyName,
  randDepartment,
  randFullName,
  randNumber,
  randPastDate,
  randProductName,
  randText,
  randUuid
} from '@ngneat/falso';
import { InnovationsService } from '../_services/innovations.service';
import type { ResponseDTO } from './transformation.dtos';

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

const expected = {
  count: 2,
  data: [
    {
      id: randUuid(),
      name: randProductName(),
      description: randText(),
      status: InnovationStatusEnum.CREATED,
      statusUpdatedAt: randPastDate(),
      submittedAt: null,
      updatedAt: randPastDate(),
      countryName: null,
      postCode: null,
      mainCategory: null,
      otherMainCategoryDescription: null,
      groupedStatus: InnovationGroupedStatusEnum.RECORD_NOT_SHARED
    },
    {
      id: randUuid(),
      name: randProductName(),
      description: randText(),
      status: InnovationStatusEnum.IN_PROGRESS,
      statusUpdatedAt: randPastDate(),
      submittedAt: null,
      updatedAt: randPastDate(),
      countryName: null,
      postCode: null,
      mainCategory: null,
      otherMainCategoryDescription: null,
      groupedStatus: InnovationGroupedStatusEnum.AWAITING_SUPPORT,
      assessment: {
        id: randUuid(),
        createdAt: randPastDate(),
        finishedAt: randPastDate(),
        assignedTo: { name: randFullName() },
        reassessmentCount: randNumber(),
        isExempted: false
      },
      supports: [
        {
          id: randUuid(),
          status: InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED,
          updatedAt: randPastDate(),
          organisation: {
            id: randUuid(),
            name: randCompanyName(),
            acronym: randAbbreviation(),
            unit: {
              id: randUuid(),
              name: randDepartment(),
              acronym: randAbbreviation(),
              users: []
            }
          }
        }
      ],
      notifications: randNumber(),
      statistics: {
        tasks: randNumber(),
        messages: randNumber()
      }
    }
  ]
};
const mock = jest.spyOn(InnovationsService.prototype, 'getInnovationsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-list Suite', () => {
  describe('200', () => {
    it('should return the innovations', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('400', () => {
    it('should return bad request on invalid parameters', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setQuery({ invalid: 'invalid' })
        .call<ResponseDTO>(azureFunction);

      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator collaborator', 200, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });

    it('access with user A should give 200', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.ingridAccessor)
        .setQuery({ status: 'IN_PROGRESS' })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(200);
    });
  });
});
