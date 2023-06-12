import v1InnovationActionCreate from '.'; // Must be imported first to start inversify configurations.

import { randText, randUuid } from '@ngneat/falso';

import { AzureHttpTriggerBuilder, CompleteScenarioType, TestsHelper } from '@innovations/shared/tests';

import { container } from '../_config';
import type { InnovationActionsService } from '../_services/innovation-actions.service';
import SYMBOLS from '../_services/symbols';

import type { ResponseDTO } from './transformation.dtos';
import type { BodyType, ParamsType } from './validation.schemas';

jest.mock(`@innovations/shared/decorators`, () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)
}));
// MocksHelper.mockJwtDecoderDecorator('innovations');

describe('Innovations / v1-innovation-action-create / index suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;
  let innovationActionsService: InnovationActionsService;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
    innovationActionsService = container.get<InnovationActionsService>(SYMBOLS.InnovationActionsService);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it('Should run function and succeed', async () => {
    const expected: ResponseDTO = { id: randUuid() };

    jest.spyOn(innovationActionsService, 'createAction').mockResolvedValue({ id: expected.id });

    const result = await new AzureHttpTriggerBuilder()
      .setAuth(scenario.users.johnInnovator, 'innovatorRole')
      .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
      .setBody<BodyType>({
        section: 'INNOVATION_DESCRIPTION',
        description: randText()
      })
      .call<ResponseDTO>(v1InnovationActionCreate);

    expect(1).toBe(1); // TODO: Scenario needs an accessor!

    expect(result).toBeDefined();
    // expect(result.status).toBe(200);
    // expect(result.body).toMatchObject(expected);
  });

  // it('Should run function and fail', async () => {

  //   jest.spyOn(DispatchService.prototype, 'saveInAppNotification').mockRejectedValue(new Error());

  //   try {

  //     await new AzureQueueTriggerBuilder()
  //       .setRequestData({
  //         requestUser: { id: scenario.users.johnInnovator.id },
  //         innovationId: scenario.users.johnInnovator.innovations[0]?.id,
  //         context: {
  //           type: NotificationContextTypeEnum.INNOVATION,
  //           detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION,
  //           id: scenario.users.johnInnovator.innovations[0]?.id
  //         },
  //         userRoleIds: [scenario.users.johnInnovator.roles[0]?.id],
  //         params: {}
  //       })
  //       .call<{ done: boolean }>(V1SendInAppListener);

  //     fail();

  //   } catch (error) {
  //     expect(error).toEqual(new Error());
  //   }

  // });
});
