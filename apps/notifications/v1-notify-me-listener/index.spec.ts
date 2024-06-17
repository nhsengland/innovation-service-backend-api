import { randUuid } from '@ngneat/falso';
import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@notifications/shared/errors';
import { StorageQueueService } from '@notifications/shared/services';
import { QueuesEnum } from '@notifications/shared/services/integrations/storage-queue.service';
import { AzureQueueTriggerBuilder } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import v1NotifyMeListener from '.';
import { NotifyMeHandler } from '../_notify-me/notify-me.handler';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';

describe('NotifyMe Listener Suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const handlerSpy = jest.spyOn(NotifyMeHandler.prototype, 'execute').mockResolvedValue();
  const storageSpy = jest.spyOn(StorageQueueService.prototype, 'sendMessage').mockResolvedValue({} as any);

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(() => {
    handlerSpy.mockClear();
  });

  describe('queueTrigger', () => {
    it('should send emails and in-app messages', async () => {
      jest.spyOn(NotifyMeHandler.prototype, 'emails', 'get').mockReturnValue(['email1', 'email2'] as any);
      jest
        .spyOn(NotifyMeHandler.prototype, 'inApps', 'get')
        .mockReturnValue([
          { data: { userRoleIds: ['inapp1'] } },
          { data: { userRoleIds: ['inapp2'] } },
          { data: { userRoleIds: ['inapp3'] } }
        ] as any);
      const result = await new AzureQueueTriggerBuilder()
        .setRequestData({
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          type: 'SUPPORT_UPDATED',
          params: {
            status: InnovationSupportStatusEnum.ENGAGING,
            units: randUuid()
          }
        })
        .call<{ done: boolean }>(v1NotifyMeListener);

      expect(handlerSpy).toHaveBeenCalledTimes(1);
      expect(storageSpy).toHaveBeenCalledTimes(5);
      expect(storageSpy).toHaveBeenNthCalledWith(1, QueuesEnum.EMAIL, 'email1');
      expect(storageSpy).toHaveBeenNthCalledWith(2, QueuesEnum.EMAIL, 'email2');
      expect(storageSpy).toHaveBeenNthCalledWith(3, QueuesEnum.IN_APP, { data: { userRoleIds: ['inapp1'] } });
      expect(storageSpy).toHaveBeenNthCalledWith(4, QueuesEnum.IN_APP, { data: { userRoleIds: ['inapp2'] } });
      expect(storageSpy).toHaveBeenNthCalledWith(5, QueuesEnum.IN_APP, { data: { userRoleIds: ['inapp3'] } });
      expect(result).toEqual({ done: true });
    });

    it('validates payload', async () => {
      const func = new AzureQueueTriggerBuilder().setRequestData({
        requestUser: DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
        type: 'SUPPORT_UPDATED_ERROR',
        params: {}
      });

      await expect(func.call<{ done: boolean }>(v1NotifyMeListener)).rejects.toThrow(
        new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD)
      );
    });

    it('rethrows errors', async () => {
      const func = new AzureQueueTriggerBuilder().setRequestData({
        requestUser: DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
        type: 'SUPPORT_UPDATED',
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: randUuid()
        }
      });

      handlerSpy.mockRejectedValueOnce(new Error('test'));

      await expect(func.call<{ done: boolean }>(v1NotifyMeListener)).rejects.toThrow(new Error('test'));
    });
  });
});
