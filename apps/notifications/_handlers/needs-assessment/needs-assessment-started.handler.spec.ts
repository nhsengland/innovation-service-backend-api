import { randText, randUuid } from '@ngneat/falso';
import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { threadUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { NeedsAssessmentStartedHandler } from './needs-assessment-started.handler';

describe('Notifications / _handlers / needs assessment start suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  describe('when assessment starts', () => {
    const recipients = [scenario.users.johnInnovator, scenario.users.janeInnovator].map(user =>
      DTOsHelper.getRecipientUser(user)
    );
    const inputData = {
      innovationId: innovation.id,
      assessmentId: randUuid(),
      message: randText(),
      messageId: randUuid(),
      threadId: randUuid()
    };

    describe('NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR', () => {
      it('should send an email to the innovator', async () => {
        await testEmails(NeedsAssessmentStartedHandler, 'NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR', {
          notificationPreferenceType: NotificationCategoryEnum.NEEDS_ASSESSMENT,
          inputData: inputData,
          outputData: {
            innovation_name: innovation.name,
            message: inputData.message,
            message_url: threadUrl(ServiceRoleEnum.INNOVATOR, inputData.innovationId, inputData.threadId)
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: recipients
        });
      });

      it('should send an inapp to the innovator', async () => {
        await testInApps(NeedsAssessmentStartedHandler, 'NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR', {
          innovationId: inputData.innovationId,
          context: {
            type: NotificationCategoryEnum.NEEDS_ASSESSMENT,
            id: inputData.assessmentId
          },
          inputData: inputData,
          outputData: {
            innovationName: innovation.name,
            threadId: inputData.threadId,
            messageId: inputData.messageId
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: recipients
        });
      });
    });
  });
});
