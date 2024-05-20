import azureFunction from '.';

import { AzureQueueTriggerBuilder, CompleteScenarioType, TestsHelper } from '@innovations/shared/tests';

import { SearchService } from '../_services/search.service';
import type { ElasticSearchEventUpdateTypes } from '@innovations/shared/decorators';
import { BadRequestError, GenericErrorsEnum } from '@innovations/shared/errors';

describe('v1-innovation-updated-index-listener suite', () => {
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
    const serviceSpy = jest.spyOn(SearchService.prototype, 'upsertDocument').mockResolvedValue();
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    const result = await new AzureQueueTriggerBuilder()
      .setRequestData({
        innovationId: innovation.id,
        type: 'INNOVATION_UPDATE' as ElasticSearchEventUpdateTypes
      })
      .call<{ done: boolean }>(azureFunction);

    expect(result).toBeDefined();
    expect(serviceSpy).toHaveBeenCalledWith(innovation.id);
    expect(result.done).toBe(true);
  });


  it('Should run function and fail when payload is invalid', async () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    try {
      await new AzureQueueTriggerBuilder()
        .setRequestData({ innovationId: innovation.id, type: 'BATATA' })
        .call<{ done: boolean }>(azureFunction);

      fail();
    } catch (error) {
      expect(error).toEqual(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
    }
  });
});
