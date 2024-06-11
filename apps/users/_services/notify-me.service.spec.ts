import { container } from '../_config';

import type { EntityManager } from 'typeorm';

import { randUuid } from '@ngneat/falso';
import { NotifyMeSubscriptionEntity } from '@users/shared/entities';
import { InnovationSupportStatusEnum } from '@users/shared/enums';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { fail } from 'assert';
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

  describe('getNotifyMeSubscriptions', () => {
    it('gets my notify me list', async () => {
      const subscriptions = await sut.getNotifyMeSubscriptions(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(subscriptions.length).toBe(2);
      expect(subscriptions).toMatchObject([
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
      ]);
    });
  });
});
