import { randUuid } from '@ngneat/falso';

import V1SendInAppListener from '.'; // Must be imported first to start inversify configurations.

import type { CompleteScenarioType } from '@notifications/shared/tests';
import { AzureQueueTriggerBuilder, TestsHelper } from '@notifications/shared/tests';

import { DispatchService } from '../_services/dispatch.service';
import { randomUUID } from 'crypto';

describe('Notifications / v1-in-app-listener / index suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it('Should run function and succeed', async () => {
    const serviceSpy = jest.spyOn(DispatchService.prototype, 'saveInAppNotification').mockResolvedValue({
      id: randUuid()
    });

    const result = await new AzureQueueTriggerBuilder()
      .setRequestData({
        requestUser: { id: scenario.users.johnInnovator.id },
        innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
        context: {
          type: 'NEEDS_ASSESSMENT',
          detail: 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR',
          id: scenario.users.johnInnovator.innovations.johnInnovation.id
        },
        userRoleIds: [scenario.users.johnInnovator.roles['innovatorRole']?.id],
        params: {},
        notificationId: randomUUID()
      })
      .call<{ done: boolean }>(V1SendInAppListener);

    expect(result).toBeDefined();
    expect(serviceSpy).toHaveBeenCalled();
    expect(result.done).toBe(true);
  });

  it('Should run function and fail', async () => {
    jest.spyOn(DispatchService.prototype, 'saveInAppNotification').mockRejectedValue(new Error());

    try {
      await new AzureQueueTriggerBuilder()
        .setRequestData({
          requestUser: { id: scenario.users.johnInnovator.id },
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          context: {
            type: 'NEEDS_ASSESSMENT',
            detail: 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR',
            id: scenario.users.johnInnovator.innovations.johnInnovation.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles['innovatorRole']?.id],
          params: {},
          notificationId: randomUUID()
        })
        .call<{ done: boolean }>(V1SendInAppListener);

      fail();
    } catch (error) {
      expect(error).toEqual(new Error());
    }
  });
});
