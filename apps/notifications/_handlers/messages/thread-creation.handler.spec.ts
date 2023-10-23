import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { CompleteScenarioType, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { threadUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { ThreadCreationHandler } from './thread-creation.handler';

describe('Notifications / _handlers / thread-creation suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await new NotificationsTestsHelper().init();
  });

  describe('ME01_THREAD_CREATION', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const thread = innovation.threads.threadByAliceQA;
    const recipients = [
      DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
      DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)
    ];

    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'threadFollowerRecipients').mockResolvedValue(recipients);
    });

    describe.each([
      [ServiceRoleEnum.INNOVATOR, scenario.users.johnInnovator],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.aliceQualifyingAccessor]
    ])(
      'as a %s',
      (
        role: ServiceRoleEnum,
        requestUser:
          | CompleteScenarioType['users']['johnInnovator']
          | CompleteScenarioType['users']['aliceQualifyingAccessor']
      ) => {
        const displayTag = HandlersHelper.getNotificationDisplayTag(role, {
          unitName: requestUser.organisations?.healthOrg?.organisationUnits?.healthOrgUnit?.name
        });

        it('should send an email to the followers when a thread is created', async () => {
          await testEmails(ThreadCreationHandler, 'ME01_THREAD_CREATION', {
            notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
            requestUser: DTOsHelper.getUserRequestContext(requestUser),
            inputData: {
              innovationId: innovation.id,
              threadId: thread.id,
              messageId: thread.messages.aliceMessage.id
            },
            recipients: recipients,
            outputData: recipients.map(r => ({
              innovation_name: innovation.name,
              sender: `${requestUser.name} (${displayTag})`,
              thread_url: threadUrl(r.role, innovation.id, thread.id)
            }))
          });
        });

        it('should send an in-app to the followers when a thread is created', async () => {
          await testInApps(ThreadCreationHandler, 'ME01_THREAD_CREATION', {
            innovationId: innovation.id,
            context: { type: NotificationCategoryEnum.MESSAGE, id: thread.id },
            requestUser: DTOsHelper.getUserRequestContext(requestUser),
            inputData: {
              innovationId: innovation.id,
              threadId: thread.id,
              messageId: thread.messages.aliceMessage.id
            },
            recipients: recipients,
            outputData: {
              senderDisplayInformation: role === ServiceRoleEnum.INNOVATOR ? requestUser.name : displayTag,
              innovationName: innovation.name,
              threadId: thread.id,
              messageId: thread.messages.aliceMessage.id
            }
          });
        });
      }
    );
  });
});
