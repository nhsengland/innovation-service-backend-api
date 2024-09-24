import azureFunction from '.';

import { randUserName, randUuid } from '@ngneat/falso';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { OrganisationsService } from '../_services/organisations.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { ServiceRoleEnum } from '@users/shared/enums';

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
  count: 1,
  data: [
    {
      accessor: { name: randUserName(), role: ServiceRoleEnum.QUALIFYING_ACCESSOR },
      innovations: [{ id: randUuid(), name: randUserName() }]
    }
  ]
};
const mock = jest.spyOn(OrganisationsService.prototype, 'getAccessorAndInnovations').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-organisation-unit-accessors Suite', () => {
  describe('200', () => {
    it('should return the unit accessors and associated innovations', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          organisationId: scenario.organisations.healthOrg.id,
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          organisationId: scenario.organisations.healthOrg.id,
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
