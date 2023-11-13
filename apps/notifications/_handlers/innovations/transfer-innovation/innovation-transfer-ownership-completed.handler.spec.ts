import { InnovationTransferStatusEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { IdentityProviderService } from '@notifications/shared/services';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../../_config';
import { RecipientsService } from '../../../_services/recipients.service';
import { InnovationTransferOwnershipCompletedHandler } from './innovation-transfer-ownership-completed.handler';

describe('Notifications / _handlers / innovation-transfer-ownership-completed handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationTransferOwnershipCompletedHandler;

  let innovation: CompleteScenarioType['users']['adamInnovator']['innovations']['adamInnovation'];
  let previousInnovationOwner: CompleteScenarioType['users']['adamInnovator'];
  let newInnovationOwner: CompleteScenarioType['users']['janeInnovator'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.adamInnovator.innovations.adamInnovation;
    previousInnovationOwner = scenario.users.adamInnovator;
    newInnovationOwner = scenario.users.janeInnovator;
  });

  describe('Innovation transfer completed to state COMPLETED', () => {
    beforeEach(() => {
      // mock innovation info after transfer for new owner
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: newInnovationOwner.id,
        ownerIdentityId: newInnovationOwner.identityId
      });

      // mock transfer info
      jest.spyOn(RecipientsService.prototype, 'innovationTransferInfoWithOwner').mockResolvedValueOnce({
        id: innovation.transfer.id,
        email: innovation.transfer.email,
        status: InnovationTransferStatusEnum.COMPLETED,
        ownerId: previousInnovationOwner.id
      });

      // mock transfer owner recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'));

      handler = new InnovationTransferOwnershipCompletedHandler(
        DTOsHelper.getUserRequestContext(newInnovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );
    });

    it('Should send email to transfer creator', async () => {
      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER',
          to: DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovator_name: previousInnovationOwner.name,
            innovation_name: innovation.name,
            new_innovator_name: newInnovationOwner.name,
            new_innovator_email: newInnovationOwner.email
          }
        }
      ]);
    });

    it('Should correct innovator names when they are not found', async () => {
      // mock innovators info  not found
      jest
        .spyOn(RecipientsService.prototype, 'usersIdentityInfo')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_TRANSFER_COMPLETED_TO_ORIGINAL_OWNER',
          to: DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovator_name: 'user',
            innovation_name: innovation.name,
            new_innovator_name: 'user',
            new_innovator_email: 'user email'
          }
        }
      ]);
    });
  });

  describe('Innovation transfer completed to status CANCELED', () => {
    beforeEach(() => {
      // mock innovation info with original owner because transfer was cancelled
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: previousInnovationOwner.id,
        ownerIdentityId: previousInnovationOwner.identityId
      });

      // mock transfer info
      jest.spyOn(RecipientsService.prototype, 'innovationTransferInfoWithOwner').mockResolvedValueOnce({
        id: innovation.transfer.id,
        email: innovation.transfer.email,
        status: InnovationTransferStatusEnum.CANCELED,
        ownerId: previousInnovationOwner.id
      });

      // mock transfer owner recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'));

      handler = new InnovationTransferOwnershipCompletedHandler(
        DTOsHelper.getUserRequestContext(newInnovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );
    });

    it('Should send email to transfer creator', async () => {
      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER',
          to: { email: innovation.transfer.email },
          notificationPreferenceType: null,
          params: {
            innovator_name: previousInnovationOwner.name,
            innovation_name: innovation.name
          }
        }
      ]);
    });

    it('Should correct innovator names when they are not found', async () => {
      // mock innovators info  not found
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_TRANSFER_CANCELLED_TO_NEW_OWNER',
          to: { email: innovation.transfer.email },
          notificationPreferenceType: null,
          params: {
            innovator_name: 'user',
            innovation_name: innovation.name
          }
        }
      ]);
    });
  });

  describe('Innovation transfer completed to status DECLINED', () => {
    beforeEach(() => {
      // mock innovation info with original owner because transfer was declined
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: previousInnovationOwner.id,
        ownerIdentityId: previousInnovationOwner.identityId
      });

      // mock transfer info
      jest.spyOn(RecipientsService.prototype, 'innovationTransferInfoWithOwner').mockResolvedValueOnce({
        id: innovation.transfer.id,
        email: innovation.transfer.email,
        status: InnovationTransferStatusEnum.DECLINED,
        ownerId: previousInnovationOwner.id
      });

      // mock transfer owner recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'));

      handler = new InnovationTransferOwnershipCompletedHandler(
        DTOsHelper.getUserRequestContext(newInnovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          transferId: innovation.transfer.id
        },
        MocksHelper.mockContext()
      );
    });

    it('Should send email to transfer creator', async () => {
      // mock target user identity info
      jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce({
        identityId: newInnovationOwner.identityId,
        displayName: newInnovationOwner.name,
        email: newInnovationOwner.email,
        phone: null
      });

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER',
          to: DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovator_name: previousInnovationOwner.name,
            new_innovator_name: newInnovationOwner.name,
            innovation_name: innovation.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        }
      ]);
    });

    it('Should correct innovator names when they are not found', async () => {
      // mock innovators info  not found
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);
      jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce(null);

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_TRANSFER_DECLINED_TO_ORIGINAL_OWNER',
          to: DTOsHelper.getRecipientUser(previousInnovationOwner, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovator_name: 'user',
            new_innovator_name: innovation.transfer.email,
            innovation_name: innovation.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        }
      ]);
    });
  });
});
