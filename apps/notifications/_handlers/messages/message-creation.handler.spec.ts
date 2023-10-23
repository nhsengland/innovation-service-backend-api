import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { CompleteScenarioType, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { threadUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { MessageCreationHandler } from './message-creation.handler';

describe('Notifications / _handlers / message-creation suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await new NotificationsTestsHelper().init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const thread = innovation.threads.threadByPaulNA;

  describe('Message creation', () => {
    const recipients = [
      DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
      DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
      DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)
    ];

    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'threadFollowerRecipients').mockResolvedValue(recipients);
    });

    describe('ME03_THREAD_MESSAGE_CREATION', () => {
      describe.each([
        [ServiceRoleEnum.INNOVATOR, scenario.users.johnInnovator],
        [ServiceRoleEnum.ASSESSMENT, scenario.users.paulNeedsAssessor]
      ])(
        'as a %s',
        (
          role: ServiceRoleEnum,
          requestUser:
            | CompleteScenarioType['users']['johnInnovator']
            | CompleteScenarioType['users']['paulNeedsAssessor']
        ) => {
          const sender = `${requestUser.name} (${HandlersHelper.getNotificationDisplayTag(role, {})})`;

          it('should send an email to the followers (expect self) when a message is created', async () => {
            await testEmails(MessageCreationHandler, 'ME03_THREAD_MESSAGE_CREATION', {
              notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
              requestUser: DTOsHelper.getUserRequestContext(requestUser),
              inputData: {
                innovationId: innovation.id,
                threadId: thread.id,
                messageId: thread.messages.johnMessage.id
              },
              recipients: recipients,
              outputData: recipients.map(r => ({
                innovation_name: innovation.name,
                sender: sender,
                thread_url: threadUrl(r.role, innovation.id, thread.id)
              }))
            });
          });

          it('should send an in-app to the followers (expect self) when a message is created', async () => {
            await testInApps(MessageCreationHandler, 'ME03_THREAD_MESSAGE_CREATION', {
              innovationId: innovation.id,
              context: { type: NotificationCategoryEnum.MESSAGE, id: thread.messages.johnMessage.id },
              requestUser: DTOsHelper.getUserRequestContext(requestUser),
              inputData: {
                innovationId: innovation.id,
                threadId: thread.id,
                messageId: thread.messages.johnMessage.id
              },
              recipients: recipients,
              outputData: {
                senderDisplayInformation:
                  role === ServiceRoleEnum.INNOVATOR
                    ? requestUser.name
                    : HandlersHelper.getNotificationDisplayTag(role, {}),
                innovationName: innovation.name,
                threadId: thread.id,
                messageId: thread.messages.johnMessage.id
              }
            });
          });
        }
      );
    });
  });
});
