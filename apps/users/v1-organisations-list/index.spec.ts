import azureFunction from '.';

import { randAbbreviation, randCompanyName, randUuid } from '@ngneat/falso';
import { GenericErrorsEnum } from '@users/shared/errors';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { OrganisationsService } from '../_services/organisations.service';
import type { ResponseDTO } from './transformation.dtos';

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

const expected = [
  {
    id: randUuid(),
    name: randCompanyName(),
    acronym: randAbbreviation(),
    organisationUnits: [
      {
        id: randUuid(),
        name: randCompanyName(),
        acronym: randAbbreviation(),
        isActive: true
      }
    ],
    isActive: true
  }
];
const mock = jest.spyOn(OrganisationsService.prototype, 'getOrganisationsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-organisations-list Suite', () => {
  describe('200', () => {
    it('should return the organisations', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor],
      ['Innovator', scenario.users.johnInnovator]
    ])("shouldn't return isActive if user %s", async (_label, user) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ResponseDTO>(azureFunction);

      result.body.forEach(item => {
        expect(item.isActive).toBeUndefined();
        item.organisationUnits?.forEach(ou => {
          expect(ou.isActive).toBeUndefined();
        });
      });
    });
  });

  describe('500', () => {
    it('should return 500 when an error occurs', async () => {
      mock.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(500);
      expect(result.body).toStrictEqual({
        error: GenericErrorsEnum.UNKNOWN_ERROR,
        message: 'Unknown error.'
      });
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
