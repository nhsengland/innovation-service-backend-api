import { container } from '../../_config/';

import { randEmail, randUuid } from '@ngneat/falso';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails } from '../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { UserEmailAddressUpdatedHandler } from './user-email-address-updated.handler';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / user-email-address-updated suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.allMighty;
  const user = scenario.users.johnInnovator;

  describe('AP08_USER_EMAIL_ADDRESS_UPDATED', () => {
    const oldEmail = randEmail();
    const newEmail = randEmail();
    it('should send a confirmation email to the user whose email was changed', async () => {
      await testEmails(UserEmailAddressUpdatedHandler, 'AP08_USER_EMAIL_ADDRESS_UPDATED', {
        notificationPreferenceType: 'ADMIN',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(user)],
        inputData: { identityId: user.identityId, oldEmail, newEmail },
        outputData: {
          new_email_address: newEmail
        },
        options: { includeLocked: true }
      });
    });

    it("should not send a confirmation email if the user doesn't exist", async () => {
      await testEmails(UserEmailAddressUpdatedHandler, 'AP08_USER_EMAIL_ADDRESS_UPDATED', {
        notificationPreferenceType: 'ADMIN',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [],
        inputData: { identityId: randUuid(), oldEmail, newEmail },
        outputData: {
          new_email_address: newEmail
        },
        options: { includeLocked: true }
      });
    });
  });
});
