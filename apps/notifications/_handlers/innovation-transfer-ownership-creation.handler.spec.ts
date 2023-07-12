import { InnovationTransferOwnershipCreationHandler } from './innovation-transfer-ownership-creation.handler';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { RecipientsService } from '../_services/recipients.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';
import { IdentityProviderService } from '@notifications/shared/services';

describe('Notifications / _handlers / innovation-transfer-ownership-creation handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationTransferOwnershipCreationHandler;

  let innovation: CompleteScenarioType['users']['adamInnovator']['innovations']['adamInnovation'];
  let innovationOwner: CompleteScenarioType['users']['adamInnovator'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.adamInnovator.innovations.adamInnovation;
    innovationOwner = scenario.users.adamInnovator;
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationTransferInfoWithOwner').mockResolvedValueOnce({
      id: innovation.transfer.id,
      email: innovation.transfer.email,
      status: innovation.transfer.status,
      ownerId: innovationOwner.id
    });
  });

  describe('Transfer to user that exists in the service', () => {
    beforeEach(() => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce({
        identityId: scenario.users.janeInnovator.identityId,
        displayName: scenario.users.janeInnovator.name,
        email: scenario.users.janeInnovator.email,
        phone: null
      });

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'));
    });

    it('Should send email to target user', async () => {
      handler = new InnovationTransferOwnershipCreationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER,
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovator_name: innovationOwner.name,
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/dashboard').buildUrl()
          }
        }
      ]);
    });

    it('Should correct innovation owner name when innovation owner is not found', async () => {
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      handler = new InnovationTransferOwnershipCreationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_EXISTING_USER,
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovator_name: 'user',
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/dashboard').buildUrl()
          }
        }
      ]);
    });
  });

  describe('Transfer to user outside the service', () => {
    beforeEach(() => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce(null);

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'));
    });

    it('Should send email to target user', async () => {
      handler = new InnovationTransferOwnershipCreationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER,
          to: { email: innovation.transfer.email },
          notificationPreferenceType: null,
          params: {
            innovator_name: innovationOwner.name, 
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath(`transfers/${innovation.transfer.id}`).buildUrl()
          }
        }
      ]);
    });

    it('Should correct innovation owner name when innovation owner is not found', async () => {
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      handler = new InnovationTransferOwnershipCreationHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.INNOVATION_TRANSFER_TO_NEW_USER,
          to: { email: innovation.transfer.email },
          notificationPreferenceType: null,
          params: {
            innovator_name: 'user', 
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath(`transfers/${innovation.transfer.id}`).buildUrl()
          }
        }
      ]);
    });
  });
});
