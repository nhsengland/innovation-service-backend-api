import { container } from '../../_config/';

import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails } from '../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { NewAccountHandler } from './new-account.handler';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);
describe('Notifications / _handlers / new account', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.allMighty;
  const fakeEmail = 'fakeEmail@test.com';

  describe('AP09_NEW_ACCOUNT', () => {
    it('should send an email to the new user', async () => {
      await testEmails(NewAccountHandler, 'AP09_NEW_ACCOUNT', {
        notificationPreferenceType: 'ADMIN',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [{ email: fakeEmail }],
        inputData: { recipientEmail: fakeEmail },
        outputData: {}
      });
    });
  });
});
