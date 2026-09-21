import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import { randUuid } from '@ngneat/falso';
import { UsersService } from '../_services/users.service';

jest.mock('@admin/shared/decorators', () => ({
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
    organisation: { id: randUuid(), name: 'Org 1' },
    champions: [{ name: 'Champ 1', email: 'champ1@test.com' }],
    seniorSponsors: [{ name: 'Sponsor 1', email: 'sponsor1@test.com' }]
  }
];
const mock = jest.spyOn(UsersService.prototype, 'getStrategicRolesList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-strategic-roles-list Suite', () => {
  describe('200', () => {
    it('should list strategic roles', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });
});
