import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { collaboratorInfoUrl, createAccountUrl } from '../../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { CollaboratorInviteHandler } from './collaborator-invite.handler';

describe('Notifications / _handlers / collaborator-invite suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.johnInnovator;
  const innovation = requestUser.innovations.johnInnovation;

  describe('MC01_COLLABORATOR_INVITE_EXISTING_USER', () => {
    const collaborator = innovation.collaborators.janeCollaborator;

    it('should send an email to the new collaborator (existing user)', async () => {
      await testEmails(CollaboratorInviteHandler, 'MC01_COLLABORATOR_INVITE_EXISTING_USER', {
        notificationPreferenceType: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        inputData: { innovationId: innovation.id, collaboratorId: collaborator.id },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name,
          invitation_url: collaboratorInfoUrl(ServiceRoleEnum.INNOVATOR, innovation.id, collaborator.id)
        }
      });
    });

    it('should send an in-app to the new collaborator (existing user)', async () => {
      await testInApps(CollaboratorInviteHandler, 'MC01_COLLABORATOR_INVITE_EXISTING_USER', {
        context: { id: collaborator.id, type: NotificationCategoryEnum.INNOVATION_MANAGEMENT },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        inputData: { innovationId: innovation.id, collaboratorId: innovation.collaborators.janeCollaborator.id },
        outputData: {
          innovationName: innovation.name,
          requestUserName: requestUser.name,
          collaboratorId: collaborator.id
        }
      });
    });
  });

  describe('MC02_COLLABORATOR_INVITE_NEW_USER', () => {
    it("should send an email to the new collaborator (new user) and don't send in-app", async () => {
      const collaborator = innovation.collaborators.elisaPendingCollaborator;

      const handler = new CollaboratorInviteHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        { innovationId: innovation.id, collaboratorId: collaborator.id },
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.emails).toStrictEqual([
        {
          templateId: 'MC02_COLLABORATOR_INVITE_NEW_USER',
          notificationPreferenceType: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
          to: { email: collaborator.email },
          params: {
            innovator_name: requestUser.name,
            innovation_name: innovation.name,
            create_account_url: createAccountUrl()
          }
        }
      ]);
      expect(handler.inApp).toHaveLength(0);
    });
  });
});
