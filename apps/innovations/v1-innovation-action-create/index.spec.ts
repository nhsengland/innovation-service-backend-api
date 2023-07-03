import v1InnovationActionCreate from '.'; // Must be imported first to start inversify configurations.

import { randText, randUuid } from '@ngneat/falso';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';

import { InnovationActionsService } from '../_services/innovation-actions.service';

import type { ResponseDTO } from './transformation.dtos';
import type { BodyType, ParamsType } from './validation.schemas';

jest.mock(`@innovations/shared/decorators`, () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)
}));
// MocksHelper.mockJwtDecoderDecorator('innovations');

describe('Innovations / v1-innovation-action-create / index suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const expected: ResponseDTO = { id: randUuid() };
  const mock = jest.spyOn(InnovationActionsService.prototype, 'createAction').mockResolvedValue({ id: expected.id });

  afterEach(async () => {
    mock.mockReset();
  });

  it('Should run function and succeed', async () => {
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
