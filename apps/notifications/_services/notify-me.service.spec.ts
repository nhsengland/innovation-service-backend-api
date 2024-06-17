import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import type { EntityManager } from 'typeorm';
import { container } from '../_config';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';
import type { NotifyMeService } from './notify-me.service';
import SYMBOLS from './symbols';

describe('NotifyMe Service Suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();
  const sut = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);
  let em: EntityManager;

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getInnovationEventSubscriptions', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should return subscriptions', async () => {
      const subscriptions = await sut.getInnovationEventSubscriptions(innovation.id, 'SUPPORT_UPDATED', em);
      expect(subscriptions.length).toBe(2);
      expect(subscriptions).toMatchObject([
        {
          id: expect.any(String),
          roleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
          innovationId: innovation.id,
          config: {
            eventType: 'SUPPORT_UPDATED',
            subscriptionType: 'INSTANTLY',
            preConditions: {
              status: [InnovationSupportStatusEnum.ENGAGING],
              units: [scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id]
            }
          }
        },
        {
          id: expect.any(String),
          roleId: scenario.users.bartQualifyingAccessor.roles.qaRole.id,
          innovationId: innovation.id,
          config: {
            eventType: 'SUPPORT_UPDATED',
            subscriptionType: 'INSTANTLY',
            preConditions: {
              status: [InnovationSupportStatusEnum.ENGAGING],
              units: [scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id]
            }
          }
        }
      ]);
    });

    it('should return empty array if no subscriptions of that type', async () => {
      const subscriptions = await sut.getInnovationEventSubscriptions(innovation.id, 'PROGRESS_UPDATE_CREATED', em);
      expect(subscriptions.length).toBe(0);
    });

    it('should return empty array if no subscriptions for that innovation', async () => {
      const subscriptions = await sut.getInnovationEventSubscriptions(
        scenario.users.ottoOctaviusInnovator.innovations.tentaclesInnovation.id,
        'SUPPORT_UPDATED',
        em
      );
      expect(subscriptions.length).toBe(0);
    });
  });
});
