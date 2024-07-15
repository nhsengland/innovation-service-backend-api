import { NotifyMeHandler } from './notify-me.handler';

import { randUuid } from '@ngneat/falso';
import { InnovationSupportStatusEnum, NotificationPreferenceEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import { supportSummaryUrl } from '../_helpers/url.helper';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';

describe('NotifyMe Handler Suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const unit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id;
  const user = scenario.users.aliceQualifyingAccessor;
  const userContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor);
  const recipient = DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor);
  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  let em: EntityManager;

  // Mocks
  const recipientMock = {
    innovationInfo: jest.fn().mockResolvedValue({ id: innovation.id, name: innovation.name }),
    getRecipientsByRoleId: jest.fn().mockResolvedValue([recipient]),
    usersIdentityInfo: jest
      .fn()
      .mockResolvedValue(
        new Map([
          [recipient.identityId, { identityId: recipient.identityId, email: user.email, displayName: user.name }]
        ])
      ),
    getEmailPreferences: jest.fn().mockResolvedValue(new Map())
  };

  const notifyMeServiceMock = {
    getInnovationEventSubscriptions: jest.fn().mockResolvedValue([
      {
        id: randUuid(),
        roleId: userContext.currentRole.id,
        innovationId: innovation.id,
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.ENGAGING],
            units: [unit]
          }
        }
      },
      {
        id: randUuid(),
        roleId: userContext.currentRole.id,
        innovationId: innovation.id,
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.CLOSED],
            units: [unit]
          }
        }
      }
    ]),
    deleteSubscription: jest.fn().mockResolvedValue(undefined)
  };

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    Object.values(recipientMock).forEach(mockFn => mockFn.mockClear());
    Object.values(notifyMeServiceMock).forEach(mockFn => mockFn.mockClear());
  });

  describe('execute', () => {
    it('executes notify me and populates inApp and emails', async () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);

      // Gets subscriptions
      expect(notifyMeServiceMock.getInnovationEventSubscriptions).toHaveBeenCalledWith(
        innovation.id,
        'SUPPORT_UPDATED',
        em
      );

      // Gets innovation info
      expect(recipientMock.innovationInfo).toHaveBeenCalledWith(innovation.id, false, em);

      // Gets recipients
      expect(recipientMock.getRecipientsByRoleId).toHaveBeenCalledWith([userContext.currentRole.id], em);

      // Gets identities
      expect(recipientMock.usersIdentityInfo).toHaveBeenCalledWith([recipient.identityId]);

      expect(handler.inApps).toHaveLength(1);
      expect(handler.emails).toHaveLength(1);
    });

    it('should return inApp but not email if preference is set to NO', async () => {
      recipientMock.getEmailPreferences.mockResolvedValue(
        new Map([[userContext.currentRole.id, { NOTIFY_ME: NotificationPreferenceEnum.NO }]])
      );
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);
      expect(handler.inApps).toHaveLength(1);
      expect(handler.emails).toHaveLength(0);
    });

    it('should return inApp and email if preference is set to YES', async () => {
      recipientMock.getEmailPreferences.mockResolvedValue(
        new Map([[userContext.currentRole.id, { NOTIFY_ME: NotificationPreferenceEnum.YES }]])
      );
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);
      expect(handler.inApps).toHaveLength(1);
      expect(handler.emails).toHaveLength(1);
    });

    it('should return inApp and email if preference is not set', async () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);
      expect(handler.inApps).toHaveLength(1);
      expect(handler.emails).toHaveLength(1);
    });

    it("should remove notification if it's run once", async () => {
      const subscriptionId = randUuid();
      notifyMeServiceMock.getInnovationEventSubscriptions.mockResolvedValueOnce([
        {
          id: subscriptionId,
          roleId: userContext.currentRole.id,
          innovationId: innovation.id,
          config: {
            eventType: 'SUPPORT_UPDATED',
            subscriptionType: 'ONCE',
            preConditions: {
              status: [InnovationSupportStatusEnum.ENGAGING],
              units: [unit]
            }
          }
        },
        {
          id: randUuid(),
          roleId: userContext.currentRole.id,
          innovationId: innovation.id,
          config: {
            eventType: 'SUPPORT_UPDATED',
            subscriptionType: 'INSTANTLY',
            preConditions: {
              status: [InnovationSupportStatusEnum.ENGAGING],
              units: [unit]
            }
          }
        }
      ]);

      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);

      // Only call for the once
      expect(notifyMeServiceMock.deleteSubscription).toHaveBeenCalledTimes(1);
      expect(notifyMeServiceMock.deleteSubscription).toHaveBeenCalledWith(subscriptionId, em);
    });

    it('should return if no subscription found', async () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });

      notifyMeServiceMock.getInnovationEventSubscriptions.mockResolvedValueOnce([]);

      await handler.execute(em);

      expect(notifyMeServiceMock.getInnovationEventSubscriptions).toHaveBeenCalled();
      expect(recipientMock.innovationInfo).not.toHaveBeenCalled();
    });

    it('should skip if the user recipient is not found', async () => {
      recipientMock.getRecipientsByRoleId.mockResolvedValueOnce([]);
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);
      expect(handler.inApps).toHaveLength(0);
      expect(handler.emails).toHaveLength(0);
    });

    it('should skip if the identity is not found', async () => {
      recipientMock.usersIdentityInfo.mockResolvedValueOnce(new Map());
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: innovation.id,
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });
      await handler.execute(em);
      expect(handler.inApps).toHaveLength(0);
      expect(handler.emails).toHaveLength(0);
    });
  });

  describe('validatePreconditions', () => {
    it('returns true if all conditions match', () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });

      const res = handler['validatePreconditions']({
        id: randUuid(),
        roleId: userContext.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.ENGAGING],
            units: [unit]
          },
          notificationType: 'SUPPORT_UPDATED'
        }
      });

      expect(res).toBe(true);
    });

    it("returns false if any condition doesn't match", () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });

      const res = handler['validatePreconditions']({
        id: randUuid(),
        roleId: userContext.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.CLOSED],
            units: [unit]
          },
          notificationType: 'SUPPORT_UPDATED'
        }
      });

      expect(res).toBe(false);
    });

    it('ignores field in the event if it is not in the preConditions', () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit,
          fake: 'test'
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });

      const res = handler['validatePreconditions']({
        id: randUuid(),
        roleId: userContext.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.ENGAGING],
            units: [unit]
          },
          notificationType: 'SUPPORT_UPDATED'
        }
      });

      expect(res).toBe(true);
    });

    it('ignores field in the conditions if it is not in the event', () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });

      const res = handler['validatePreconditions']({
        id: randUuid(),
        roleId: userContext.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.ENGAGING],
            units: [unit]
          },
          notificationType: 'SUPPORT_UPDATED'
        }
      });

      expect(res).toBe(true);
    });

    it("returns false if the event has a subscriptionId that doesn't match the subscription", () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          subscriptionId: '1'
        } as any,
        type: 'REMINDER' as const
      });

      const res = handler['validatePreconditions']({
        id: '2',
        roleId: userContext.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'REMINDER',
          subscriptionType: 'SCHEDULED',
          date: new Date(),
          customMessage: 'test'
        }
      });

      expect(res).toBe(false);
    });

    it('returns true if the event has a subscriptionId matches the subscription and other conditions met', () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
        innovationId: randUuid(),
        requestUser: userContext,
        params: {
          subscriptionId: '1'
        } as any,
        type: 'REMINDER' as const
      });

      const res = handler['validatePreconditions']({
        id: '1',
        roleId: userContext.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'REMINDER',
          subscriptionType: 'SCHEDULED',
          date: new Date(),
          customMessage: 'test'
        }
      });

      expect(res).toBe(true);
    });
  });

  describe('getInAppParams', () => {
    describe('Support Updated', () => {
      it('should return the correct params', () => {
        const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
          innovationId: randUuid(),
          requestUser: userContext,
          params: {
            status: InnovationSupportStatusEnum.ENGAGING,
            units: unit
          } as any,
          type: 'SUPPORT_UPDATED' as const
        });

        const res = handler['getInAppParams'](
          {
            id: randUuid(),
            roleId: userContext.currentRole.id,
            innovationId: randUuid(),
            config: {
              eventType: 'SUPPORT_UPDATED',
              subscriptionType: 'INSTANTLY',
              preConditions: {
                status: [InnovationSupportStatusEnum.ENGAGING],
                units: [unit]
              },
              notificationType: 'SUPPORT_UPDATED'
            }
          },
          { id: randUuid(), name: 'Test Innovation' }
        );

        expect(res).toEqual({
          innovation: 'Test Innovation',
          event: 'SUPPORT_UPDATED',
          organisation: 'Health Org Unit',
          supportStatus: 'engaging',
          unitId: unit
        });
      });
    });
  });

  describe('getEmailParams', () => {
    describe('Support Updated', () => {
      it('should return the correct params', () => {
        const innovationId = randUuid();

        const handler = new NotifyMeHandler(notifyMeServiceMock as any, recipientMock as any, {
          innovationId,
          requestUser: userContext,
          params: {
            status: InnovationSupportStatusEnum.ENGAGING,
            units: unit
          } as any,
          type: 'SUPPORT_UPDATED' as const
        });

        const res = handler['getEmailParams'](
          recipient,
          {
            id: randUuid(),
            roleId: userContext.currentRole.id,
            innovationId,
            config: {
              eventType: 'SUPPORT_UPDATED',
              subscriptionType: 'INSTANTLY',
              preConditions: {
                status: [InnovationSupportStatusEnum.ENGAGING],
                units: [unit]
              },
              notificationType: 'SUPPORT_UPDATED'
            }
          },
          { id: innovationId, name: 'Test Innovation' }
        );

        expect(res).toEqual({
          innovation: 'Test Innovation',
          organisation: 'Health Org Unit',
          supportStatus: 'engaging',
          supportSummaryUrl: supportSummaryUrl(recipient.role, innovationId, unit)
        });
      });
    });
  });
});
