import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import * as crypto from 'crypto';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { SatisfactionSurveyReminderHandler } from './satisfaction-survey-reminder.handler';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / satisfaction-survey-reminder handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const surveyId = crypto.randomUUID();
  const surveyInnovation = scenario.users.johnInnovator.innovations.johnInnovation;

  jest.spyOn(RecipientsService.prototype, 'surveyWithoutFeedbackForNDays').mockResolvedValue([
    {
      surveyId: surveyId,
      innovation: {
        id: surveyInnovation.id,
        name: surveyInnovation.name
      }
    }
  ]);

  describe('AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER', () => {
    it('Should send inapp for each survey without feedback', async () => {
      const handler = new SatisfactionSurveyReminderHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      expect(handler.inApp).toStrictEqual([
        {
          context: {
            detail: 'AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER',
            id: surveyId,
            type: 'AUTOMATIC'
          },
          userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
          innovationId: surveyInnovation.id,
          params: { innovationName: surveyInnovation.name },
          notificationId
        }
      ]);
    });
  });
});
