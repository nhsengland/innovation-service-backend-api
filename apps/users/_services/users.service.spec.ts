import { CompleteScenarioType, MocksHelper, TestsHelper } from '@users/shared/tests';

import { container } from '../_config';

import SYMBOLS from './symbols';
import type { UsersService } from './users.service';

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
      expect(result).toMatchObject({
        id: user.id,
        displayName: user.name,
        email: user.email,
        phone: user.mobilePhone,
        type: user.roles[0]?.role,
        lockedAt: null,
        userOrganisations: [],
        innovations: [
          {
            id: scenario.users.johnInnovator.innovations?.[0]?.id,
            name: scenario.users.johnInnovator.innovations?.[0]?.name
          }
        ]
      });
    });
  });

  describe('getUserPendingInnovationTransfers method suite', () => {
    it('Get a pending transfer', async () => {
      const innovation = scenario.users.adamInnovator.innovations[0];

      if (!innovation) {
        throw new Error(`No innovation found`);
      }
      if (!innovation.transfers[0]?.email) {
        throw new Error(`No email found`);
      }

      const result = await usersService.getUserPendingInnovationTransfers(innovation.transfers[0].email);

      expect(result).toMatchObject(
        innovation.transfers.map(t => ({
          id: t.id,
          innovation: { id: innovation.id, name: innovation.name }
        }))
      );
    });
  });
});
