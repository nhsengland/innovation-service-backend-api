import { ServiceRoleEnum } from '@notifications/shared/enums';
import { SYSTEM_CRON_SENDER } from '@notifications/shared/services/integrations/notifier.service';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import * as crypto from 'crypto';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { manageInnovationUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { InnovationTransferOwnershipExpirationHandler } from './innovation-transfer-ownership-expiration.handler';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / innovation-transfer-ownership-expiration handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.adamInnovator.innovations.adamInnovation;
  const innovationOwner = scenario.users.adamInnovator;

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('Innovation owner is found', () => {
    beforeEach(async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
    });

    it('Should send email to innovation owner', async () => {
      await testEmails(InnovationTransferOwnershipExpirationHandler, 'AU09_TRANSFER_EXPIRED', {
        notificationPreferenceType: 'AUTOMATIC',
        inputData: {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        outputData: {
          innovation_name: innovation.name,
          manage_innovation_url: manageInnovationUrl(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId)
        },
        recipients: [DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole')],
        requestUser: SYSTEM_CRON_SENDER
      });
    });

    it('Should send inApp to innovation owner', async () => {
      await testInApps(InnovationTransferOwnershipExpirationHandler, 'AU09_TRANSFER_EXPIRED', {
        inputData: {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        outputData: {
          innovationName: innovation.name
        },
        context: {
          id: innovation.id,
          type: 'AUTOMATIC'
        },
        innovationId: innovation.id,
        recipients: [DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole')],
        requestUser: SYSTEM_CRON_SENDER,
        notificationId
      });
    });
  });

  describe('Innovation owner is not found', () => {
    let handler: InnovationTransferOwnershipExpirationHandler;
    let loggerSpy: jest.SpyInstance;

    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: undefined,
        ownerIdentityId: undefined
      });

      handler = new InnovationTransferOwnershipExpirationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id
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
