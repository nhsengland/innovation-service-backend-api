import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { AzureQueueTriggerBuilder, CompleteScenarioType, TestsHelper } from '@notifications/shared/tests';

import V1SendInAppListener from '.';
import { DispatchService } from '../_services/dispatch.service';

describe('Notitications / v1-in-app-listener / index suite', () => {

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
      id: 'random-id'
    });

    const result = await new AzureQueueTriggerBuilder()
      .setRequestData({
        requestUser: { id: scenario.users.johnInnovator.id },
        innovationId: scenario.users.johnInnovator.innovations[0]?.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION,
          id: scenario.users.johnInnovator.innovations[0]?.id
        },
        userRoleIds: [scenario.users.johnInnovator.roles[0]?.id],
        params: {}
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
          innovationId: scenario.users.johnInnovator.innovations[0]?.id,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION,
            id: scenario.users.johnInnovator.innovations[0]?.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles[0]?.id],
          params: {}
        })
        .call<{ done: boolean }>(V1SendInAppListener);

      fail();

    } catch (error) {
      expect(error).toEqual(new Error());
    }

  });

});
