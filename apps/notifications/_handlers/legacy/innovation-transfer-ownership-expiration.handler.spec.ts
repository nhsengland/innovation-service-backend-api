import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { InnovationTransferOwnershipExpirationHandler } from './innovation-transfer-ownership-expiration.handler';

describe('Notifications / _handlers / innovation-transfer-ownership-expiration handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationTransferOwnershipExpirationHandler;

  let innovation: CompleteScenarioType['users']['adamInnovator']['innovations']['adamInnovation'];
  let innovationOwner: CompleteScenarioType['users']['adamInnovator'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.adamInnovator.innovations.adamInnovation;
    innovationOwner = scenario.users.adamInnovator;
  });

  describe('Innovation owner is found', () => {
    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));

      handler = new InnovationTransferOwnershipExpirationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send email to innovation owner', () => {
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_EXPIRED,
          to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(`/innovator/innovations/${innovation.id}/overview`)
              .buildUrl()
          }
        }
      ]);
    });

    it('Should send inApp to innovation owner', () => {
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.TRANSFER_EXPIRED,
            id: innovation.transfer.id
          },
          userRoleIds: [innovationOwner.roles.innovatorRole.id],
          params: {}
        }
      ]);
    });
  });

  describe('Innovation owner is not found', () => {
    let loggerSpy: jest.SpyInstance<void, any[]>;

    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: undefined,
        ownerIdentityId: undefined
      });

      handler = new InnovationTransferOwnershipExpirationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );

      loggerSpy = jest.spyOn(handler.logger, 'error');

      await handler.run();
    });
    it('Should log that the innovation owner was not found', () => {
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('Should not send email or inApp to innovation owner', () => {
      expect(handler.emails).toHaveLength(0);
      expect(handler.inApp).toHaveLength(0);
    });
  });
});
