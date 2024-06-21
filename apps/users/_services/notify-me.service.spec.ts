import { container } from '../_config';

import { randUuid } from '@ngneat/falso';
import { NotificationScheduleEntity, NotifyMeSubscriptionEntity } from '@users/shared/entities';
import { InnovationSupportStatusEnum } from '@users/shared/enums';
import { BadRequestError, ForbiddenError, NotFoundError } from '@users/shared/errors';
import { NotificationErrorsEnum } from '@users/shared/errors/errors.enums';
import { AuthErrorsEnum } from '@users/shared/services/auth/authorization-validation.model';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { fail } from 'assert';
import type { EntityManager } from 'typeorm';
import type { NotifyMeService } from './notify-me.service';
import SYMBOLS from './symbols';

describe('Users / _services / notify me service suite', () => {
  let sut: NotifyMeService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('createSubscription', () => {
    const data = {
      eventType: 'SUPPORT_UPDATED' as const,
      preConditions: {
        status: [InnovationSupportStatusEnum.ENGAGING as const],
        units: [randUuid()]
      },
      subscriptionType: 'INSTANTLY' as const
    };

    it('should create a subscription', async () => {
      await sut.createSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
        data,
        em
      );

      const dbResult = await em
        .getRepository(NotifyMeSubscriptionEntity)
        .find({ where: { innovation: { id: scenario.users.johnInnovator.innovations.johnInnovationArchived.id } } });
      expect(dbResult.length).toBe(1);
      expect(dbResult[0]?.config).toStrictEqual(data);
    });

    it.skip('should create a scheduled subscription', async () => {
      fail('Not implemented');
    });
  });

  describe('getInnovationSubscriptions', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    it('gets my innovation notify me list', async () => {
      const subscriptions = await sut.getInnovationSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );
      const subscription = scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation;

      expect(subscriptions.length).toBe(1);
      expect(subscriptions[0]).toMatchObject({
        eventType: subscription.eventType,
        id: subscription.id,
        organisations: [
          {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            units: [
              {
                id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
                name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
                acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
              }
            ]
          }
        ],
        status: subscription.config.preConditions.status,
        subscriptionType: subscription.subscriptionType,
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('#groupUnitsByOrganisation', () => {
    it('groups multiple units of the same organisation', () => {
      const res = sut['groupUnitsByOrganisation'](
        ['u1', 'u2'],
        new Map([
          [
            'u1',
            {
              id: 'u1',
              name: 'Unit 1',
              acronym: 'U1',
              organisation: {
                id: 'o1',
                name: 'Org 1',
                acronym: 'O1'
              }
            } as any
          ],
          [
            'u2',
            {
              id: 'u2',
              name: 'Unit 2',
              acronym: 'U2',
              organisation: {
                id: 'o1',
                name: 'Org 1',
                acronym: 'O1'
              }
            } as any
          ]
        ])
      );

      expect(res.length).toBe(1);
      expect(res[0]).toMatchObject({
        id: 'o1',
        name: 'Org 1',
        acronym: 'O1',
        units: [
          {
            id: 'u1',
            name: 'Unit 1',
            acronym: 'U1'
          },
          {
            id: 'u2',
            name: 'Unit 2',
            acronym: 'U2'
          }
        ]
      });
    });

    it('displays different organisations', () => {
      const res = sut['groupUnitsByOrganisation'](
        ['u1', 'u2'],
        new Map([
          [
            'u1',
            {
              id: 'u1',
              name: 'Unit 1',
              acronym: 'U1',
              organisation: {
                id: 'o1',
                name: 'Org 1',
                acronym: 'O1'
              }
            } as any
          ],
          [
            'u2',
            {
              id: 'u2',
              name: 'Unit 2',
              acronym: 'U2',
              organisation: {
                id: 'o2',
                name: 'Org 2',
                acronym: 'O2'
              }
            } as any
          ]
        ])
      );

      expect(res.length).toBe(2);
      expect(res).toMatchObject([
        {
          id: 'o1',
          name: 'Org 1',
          acronym: 'O1',
          units: [
            {
              id: 'u1',
              name: 'Unit 1',
              acronym: 'U1'
            }
          ]
        },
        {
          id: 'o2',
          name: 'Org 2',
          acronym: 'O2',
          units: [
            {
              id: 'u2',
              name: 'Unit 2',
              acronym: 'U2'
            }
          ]
        }
      ]);
    });
  });

  describe('getSubscription', () => {
    it('returns the subscription', async () => {
      const subscription = scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation;
      const res = await sut.getSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscription.id,
        em
      );

      expect(res).toMatchObject({
        eventType: subscription.eventType,
        id: subscription.id,
        organisations: [
          {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            units: [
              {
                id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
                name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
                acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
              }
            ]
          }
        ],
        status: subscription.config.preConditions.status,
        subscriptionType: subscription.subscriptionType,
        updatedAt: expect.any(Date)
      });
    });

    it("throws error if subscription doesn't exist", async () => {
      await expect(() =>
        sut.getSubscription(DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor), randUuid(), em)
      ).rejects.toThrow(new NotFoundError(NotificationErrorsEnum.NOTIFY_ME_SUBSCRIPTION_NOT_FOUND));
    });
  });

  describe('getNotifyMeSubscriptions', () => {
    it('gets my notify me list sorted by innovation name', async () => {
      const subscriptions = await sut.getNotifyMeSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        undefined,
        em
      );

      expect(subscriptions.length).toBe(2);
      expect(subscriptions).toMatchObject(
        [
          {
            innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
            name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            count: 1
          },
          {
            innovationId: scenario.users.adamInnovator.innovations.adamInnovation.id,
            name: scenario.users.adamInnovator.innovations.adamInnovation.name,
            count: 1
          }
        ].sort((a, b) => a.name.localeCompare(b.name))
      );
    });

    it('filters organisations not shared from the notify me list', async () => {
      await em.query('DELETE FROM innovation_share WHERE innovation_id = @0 and organisation_id = @1', [
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        scenario.organisations.healthOrg.id
      ]);
      const subscriptions = await sut.getNotifyMeSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        undefined,
        em
      );

      expect(subscriptions.length).toBe(1);
    });

    it('should return list with details', async () => {
      const subscriptions = await sut.getNotifyMeSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        true,
        em
      );

      expect(subscriptions.length).toBe(2);
      expect(subscriptions).toMatchObject(
        [
          {
            innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
            name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            count: 1,
            subscriptions: [
              {
                eventType: scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.eventType,
                id: scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.id,
                organisations: [
                  {
                    id: scenario.organisations.medTechOrg.id,
                    name: scenario.organisations.medTechOrg.name,
                    acronym: scenario.organisations.medTechOrg.acronym,
                    units: [
                      {
                        id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
                        name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
                        acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
                      }
                    ]
                  }
                ],
                status:
                  scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.config.preConditions
                    .status,
                subscriptionType:
                  scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.subscriptionType,
                updatedAt: expect.any(Date)
              }
            ]
          },
          {
            innovationId: scenario.users.adamInnovator.innovations.adamInnovation.id,
            name: scenario.users.adamInnovator.innovations.adamInnovation.name,
            count: 1,
            subscriptions: [
              {
                eventType: scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.adamInnovation.eventType,
                id: scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.adamInnovation.id,
                organisations: [
                  {
                    id: scenario.organisations.medTechOrg.id,
                    name: scenario.organisations.medTechOrg.name,
                    acronym: scenario.organisations.medTechOrg.acronym,
                    units: [
                      {
                        id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
                        name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
                        acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
                      }
                    ]
                  }
                ],
                status:
                  scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.adamInnovation.config.preConditions
                    .status,
                subscriptionType:
                  scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.adamInnovation.subscriptionType,
                updatedAt: expect.any(Date)
              }
            ]
          }
        ].sort((a, b) => a.name.localeCompare(b.name))
      );
    });
  });

  describe('updateSubscription', () => {
    it('should update a subscription', async () => {
      const subscription = scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation;
      await sut.updateSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscription.id,
        {
          eventType: 'SUPPORT_UPDATED',
          preConditions: {
            status: [InnovationSupportStatusEnum.UNSUITABLE],
            units: [randUuid()]
          },
          subscriptionType: 'INSTANTLY'
        },
        em
      );

      const dbResult = await em.getRepository(NotifyMeSubscriptionEntity).findOne({ where: { id: subscription.id } });
      expect(dbResult?.config.preConditions.status).toStrictEqual([InnovationSupportStatusEnum.UNSUITABLE]);
    });

    it('should fail if changing the subscription eventType', async () => {
      await expect(
        sut.updateSubscription(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.id,
          {
            eventType: 'PROGRESS_UPDATE_CREATED'
          } as any, // We don't have more than one type yet but this should be enough for the test
          em
        )
      ).rejects.toThrow(new BadRequestError(NotificationErrorsEnum.NOTIFY_ME_CANNOT_CHANGE_EVENT_TYPE));
    });

    it('should fail if the subscription is from a different user', async () => {
      await expect(
        sut.updateSubscription(
          DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
          scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.id,
          {
            eventType: 'SUPPORT_UPDATED',
            preConditions: {
              status: [InnovationSupportStatusEnum.UNSUITABLE],
              units: [randUuid()]
            },
            subscriptionType: 'INSTANTLY'
          },
          em
        )
      ).rejects.toThrow(new ForbiddenError(AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED));
    });
  });

  describe('deleteSubscription', () => {
    it('deletes a subscription', async () => {
      const subscription = scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation;
      await sut.deleteSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscription.id,
        em
      );

      const dbResult = await em.getRepository(NotifyMeSubscriptionEntity).findOne({ where: { id: subscription.id } });
      expect(dbResult).toBeNull();
    });

    it.skip('deletes the subscription schedules', async () => {
      const subscription = scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation; // TODO when we have a subscription with schedules
      await sut.deleteSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscription.id,
        em
      );

      const dbResult = await em.getRepository(NotifyMeSubscriptionEntity).findOne({ where: { id: subscription.id } });
      expect(dbResult).toBeNull();
    });

    it('ignores if the subscription does not exist', async () => {
      await sut.deleteSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        randUuid(),
        em
      );
    });

    it('ignores if the subscription is from another user', async () => {
      const subscription = scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation;
      await sut.deleteSubscription(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        subscription.id,
        em
      );

      const dbResult = await em.getRepository(NotifyMeSubscriptionEntity).findOne({ where: { id: subscription.id } });
      expect(dbResult).toBeDefined();
    });
  });

  describe('deleteSubscriptions', () => {
    it('deletes all my subscriptions', async () => {
      await sut.deleteSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        undefined,
        em
      );

      const res = await em
        .getRepository(NotifyMeSubscriptionEntity)
        .find({ where: { userRole: { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id } } });
      expect(res.length).toBe(0);
    });

    it('deletes all my subscriptions by id (1)', async () => {
      const subscriptions = [scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.id];
      await sut.deleteSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscriptions,
        em
      );

      const res = await em
        .getRepository(NotifyMeSubscriptionEntity)
        .find({ where: { userRole: { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id } } });
      expect(res.length).toBe(1);
    });

    it('deletes all my subscriptions by id (2)', async () => {
      const subscriptions = [
        scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.johnInnovation.id,
        scenario.users.aliceQualifyingAccessor.notifyMeSubscriptions.adamInnovation.id
      ];
      await sut.deleteSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        subscriptions,
        em
      );

      const res = await em
        .getRepository(NotifyMeSubscriptionEntity)
        .find({ where: { userRole: { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id } } });
      expect(res.length).toBe(0);
    });

    // TODO when we have schedules
    it.skip('deletes the subscriptions schedules', async () => {
      await sut.deleteSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        undefined,
        em
      );

      const res = await em
        .getRepository(NotificationScheduleEntity)
        .find({ where: { userRole: { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id } } });
      expect(res.length).toBe(0);
    });
  });
});
