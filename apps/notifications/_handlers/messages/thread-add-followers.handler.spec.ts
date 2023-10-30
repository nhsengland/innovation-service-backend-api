import { NotificationCategoryEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { threadUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { ThreadAddFollowersHandler } from './thread-add-followers.handler';

describe('Notifications / _handlers / thread-add-followers suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const thread = innovation.threads.threadByAliceQA;
  const requestUser = scenario.users.johnInnovator;
  const recipients = [
    DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
    DTOsHelper.getRecipientUser(scenario.users.ingridAccessor)
  ];

  beforeAll(async () => {
    await testsHelper.init();

    jest
      .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
      .mockResolvedValue([
        DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
        DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
        ...recipients
      ]);
  });

  describe('ME02_THREAD_ADD_FOLLOWERS', () => {
    const displayTag = HandlersHelper.getNotificationDisplayTag(requestUser.roles.innovatorRole.role, {});

    it('should send an email to the new followers of the thread', async () => {
      await testEmails(ThreadAddFollowersHandler, 'ME02_THREAD_ADD_FOLLOWERS', {
        notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: thread.id,
          newFollowersRoleIds: recipients.map(r => r.roleId)
        },
        recipients: recipients,
        outputData: recipients.map(r => ({
          innovation_name: innovation.name,
          sender: `${requestUser.name} (${displayTag})`,
          thread_url: threadUrl(r.role, innovation.id, thread.id)
        }))
      });
    });

    it('should send an in-app to the new followers of the thread', async () => {
      await testInApps(ThreadAddFollowersHandler, 'ME02_THREAD_ADD_FOLLOWERS', {
        innovationId: innovation.id,
        context: { type: NotificationCategoryEnum.MESSAGE, id: thread.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: thread.id,
          newFollowersRoleIds: recipients.map(r => r.roleId)
        },
        recipients: recipients,
        outputData: {
          senderDisplayInformation: requestUser.name,
          innovationName: innovation.name,
          threadId: thread.id
        }
      });
    });
  });
});
