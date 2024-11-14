import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import * as crypto from 'crypto';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / satisfaction-survey-reminder handler suite', () => {
  // TODO: Implement tests

  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('AU12_INNOVATOR_SURVEY_END_SUPPORT_TWO_MONTHS_REMINDER', () => {
    it('Should send inapp for each survey without feedback', async () => {});
  });
});
