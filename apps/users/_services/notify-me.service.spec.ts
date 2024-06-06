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
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        data,
        em
      );

      const dbResult = await em.getRepository(NotifyMeSubscriptionEntity).find();
      expect(dbResult.length).toBe(1);
      expect(dbResult[0]?.config).toStrictEqual(data);
    });

    it.skip('should create a scheduled subscription', async () => {
      fail('Not implemented');
    });
  });
});
