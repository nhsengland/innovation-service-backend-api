import { CompleteScenarioType, MocksHelper, TestsHelper } from '@users/shared/tests';

import { container } from '../_config';

import SYMBOLS from './symbols';
import type { UsersService } from './users.service';
import type {
  TestUserOrganisationUnitType,
  TestUserOrganisationsType
} from '@users/shared/tests/builders/user.builder';

describe('Services / Users service suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let usersService: UsersService;

  beforeAll(async () => {
    usersService = container.get<UsersService>(SYMBOLS.UsersService);
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  beforeEach(async () => {
    await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getUserById method suite', () => {
    it('Get existing user with minimal model', async () => {
      MocksHelper.mockIdentityServiceGetUserInfo(scenario.users.johnInnovator);
      const user = scenario.users.johnInnovator;
      const result = await usersService.getUserById(user.id, { model: 'minimal' });
      expect(result).toMatchObject({ id: user.id, displayName: user.name });
    });

    it('Get existing user with full model', async () => {
      MocksHelper.mockIdentityServiceGetUserInfo(scenario.users.johnInnovator);
      const user = scenario.users.johnInnovator;
      const result = await usersService.getUserById(user.id, { model: 'full' });
      const expectedOrgs = [...Object.keys(user.organisations).map(key => user.organisations[key])].filter(
        (item): item is TestUserOrganisationsType => !!item
      );
      expect(result).toMatchObject({
        id: user.id,
        displayName: user.name,
        email: user.email,
        phone: user.mobilePhone,
        type: user.roles['innovatorRole']?.role,
        lockedAt: null,
        userOrganisations: expectedOrgs.map(org => ({
          id: org.id,
          name: org.name,
          size: org.size,
          role: org.role,
          isShadow: org.isShadow,
          units: [...Object.keys(org.organisationUnits).map(key => org.organisationUnits[key])].filter(
            (item): item is TestUserOrganisationUnitType => !!item
          )
        })),
        innovations: [
          {
            id: scenario.users.johnInnovator.innovations.johnInnovation.id,
            name: scenario.users.johnInnovator.innovations.johnInnovation.name
          },
          {
            id: scenario.users.johnInnovator.innovations.johnInnovationEmpty.id,
            name: scenario.users.johnInnovator.innovations.johnInnovationEmpty.name
          }
        ]
      });
    });
  });

  describe('getUserPendingInnovationTransfers method suite', () => {
    it('Get a pending transfer', async () => {
      const result = await usersService.getUserPendingInnovationTransfers(scenario.users.janeInnovator.email);

      expect(result).toMatchObject([
        {
          id: scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
          innovation: {
            id: scenario.users.johnInnovator.innovations.johnInnovation.id,
            name: scenario.users.johnInnovator.innovations.johnInnovation.name
          }
        },
        {
          id: scenario.users.adamInnovator.innovations.adamInnovation.transfer.id,
          innovation: {
            id: scenario.users.adamInnovator.innovations.adamInnovation.id,
            name: scenario.users.adamInnovator.innovations.adamInnovation.name
          }
        }
      ]);
    });
  });
});
