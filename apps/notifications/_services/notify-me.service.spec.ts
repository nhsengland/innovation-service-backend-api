import { NotificationScheduleEntity } from '@notifications/shared/entities';
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

    it("shouldn't return the subscriptions if the innovation is not shared", async () => {
      await em.query(`DELETE FROM innovation_share WHERE organisation_id = @0`, [scenario.organisations.healthOrg.id]);
      const subscriptions = await sut.getInnovationEventSubscriptions(innovation.id, 'SUPPORT_UPDATED', em);
      expect(subscriptions.length).toBe(0);
    });
  });

  describe('getScheduledNotifications', () => {
    it('should return the scheduled notifications if within 2 hours', async () => {
      const subscription = scenario.users.bartQualifyingAccessor.notifyMeSubscriptions.adamScheduledInnovation;
      const sendDate = new Date();
      sendDate.setHours(sendDate.getHours() - 1);
      await em.update(NotificationScheduleEntity, { subscriptionId: subscription.id }, { sendDate: sendDate });
      const notifications = await sut.getScheduledNotifications(em);
      expect(notifications.length).toBe(1);
      expect(notifications[0]).toMatchObject({
        subscriptionId: subscription.id,
        innovationId: scenario.users.adamInnovator.innovations.adamInnovation.id,
        roleId: scenario.users.bartQualifyingAccessor.roles.qaRole.id
      });
    });

    it('should not return notifications if in the future', async () => {
      const subscription = scenario.users.bartQualifyingAccessor.notifyMeSubscriptions.adamScheduledInnovation;
      const sendDate = new Date();
      sendDate.setHours(sendDate.getHours() + 1);
      await em.update(NotificationScheduleEntity, { subscriptionId: subscription.id }, { sendDate: sendDate });
      const notifications = await sut.getScheduledNotifications(em);
      expect(notifications.length).toBe(0);
    });

    it('should not return notifications if in the past for more than 2 hours', async () => {
      const subscription = scenario.users.bartQualifyingAccessor.notifyMeSubscriptions.adamScheduledInnovation;
      const sendDate = new Date();
      sendDate.setHours(sendDate.getHours() + 3);
      await em.update(NotificationScheduleEntity, { subscriptionId: subscription.id }, { sendDate: sendDate });
      const notifications = await sut.getScheduledNotifications(em);
      expect(notifications.length).toBe(0);
    });
  });

  describe('deleteScheduledNotification', () => {
    const notification = scenario.users.bartQualifyingAccessor.notifyMeSubscriptions.adamScheduledInnovation;
    it('should delete the scheduled notification', async () => {
      await sut.deleteScheduledNotification(notification.id, em);
      await em.getRepository(NotificationScheduleEntity).findOneBy({ subscriptionId: notification.id });
    });
  });
});
