import azureFunction from '.';

import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randAbbreviation, randCompanyName, randFullName, randUuid } from '@ngneat/falso';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
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
    status: InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED,
    organisation: {
      id: randUuid(),
      name: randCompanyName(),
      acronym: randAbbreviation(),
      unit: { id: randUuid(), name: randCompanyName(), acronym: randAbbreviation() }
    }
  },
  {
    id: randUuid(),
    status: InnovationSupportStatusEnum.ENGAGING,
    organisation: {
      id: randUuid(),
      name: randCompanyName(),
      acronym: randAbbreviation(),
      unit: { id: randUuid(), name: randCompanyName(), acronym: randAbbreviation() }
    },
    engagingAccessors: [{ id: randUuid(), userRoleId: randUuid(), name: randFullName() }]
  }
];

const mock = jest.spyOn(InnovationSupportsService.prototype, 'getInnovationSupportsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-supports-list Suite', () => {
  describe('200', () => {
    it('should return the supports list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
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
      ['A', 200, scenario.users.ingridAccessor],
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
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
