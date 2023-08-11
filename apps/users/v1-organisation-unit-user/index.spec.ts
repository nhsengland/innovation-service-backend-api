import azureFunction from '.';

import { randCompanyName, randEmail, randUuid } from '@ngneat/falso';
import { ServiceRoleEnum } from '@users/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { OrganisationsService } from '../_services/organisations.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType, QueryParamsType } from './validation.schemas';

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

const expected = {
  id: randUuid(),
  name: randCompanyName(),
  email: randEmail(),
  role: ServiceRoleEnum.ACCESSOR
};
const mock = jest.spyOn(OrganisationsService.prototype, 'getOrganisationUnitUserByEmail').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-organisation-unit-user Suite', () => {
  describe('200', () => {
    it('should return the user info', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams<ParamsType>({
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        })
        .setQuery<QueryParamsType>({ email: expected.email })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        })
        .setQuery<QueryParamsType>({ email: expected.email })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
