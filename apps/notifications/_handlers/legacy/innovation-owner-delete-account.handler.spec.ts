import { InnovatorAccountDeletionHandler } from './innovation-owner-delete-account.handler';

import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { RecipientsService } from '../../_services/recipients.service';

import { randFutureDate } from '@ngneat/falso';
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';

describe('Notifications / _handlers / innovation-owner-delete-account handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let handler: InnovatorAccountDeletionHandler;

  const transferDate = randFutureDate().toISOString();

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;
  });

  describe('Innovation has collaborators', () => {
    beforeAll(async () => {
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator)]);

      handler = new InnovatorAccountDeletionHandler(
        DTOsHelper.getUserRequestContext(innovationOwner),
        {
          innovations: [{ id: innovation.id, name: innovation.name, transferExpireDate: transferDate }]
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send an email to the collaborators', () => {
      expect(handler.emails).toMatchObject([
        {
          templateId: 'ACCOUNT_DELETION_WITH_TRANSFER_TO_COLLABORATOR',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            transfer_expiry_date: transferDate
          }
        }
      ]);
    });

    it('Should send an inApp to the collaborators', () => {
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.TRANSFER_PENDING,
            id: innovation.id
          },
          userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id],
          params: {}
        }
      ]);
    });
  });

  describe('Innovation has no collaborators', () => {
    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValueOnce([]);
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce([]);

      handler = new InnovatorAccountDeletionHandler(
        DTOsHelper.getUserRequestContext(innovationOwner),
        {
          innovations: [{ id: innovation.id, name: innovation.name, transferExpireDate: transferDate }]
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });
    it('Should not send any email', () => {
      expect(handler.emails).toHaveLength(0);
    });
    it('Should not send any inApp', () => {
      expect(handler.inApp).toHaveLength(0);
    });
  });
});
