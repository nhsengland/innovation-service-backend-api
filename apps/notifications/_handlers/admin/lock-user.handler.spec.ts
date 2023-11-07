import { container } from '../../_config/';

import { randUuid } from '@ngneat/falso';
import { NotificationCategoryEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails } from '../../_helpers/tests.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { LockUserHandler } from './lock-user.handler';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / lock-user suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.allMighty;
  const lockedUser = scenario.users.johnInnovator;

  describe('AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS', () => {
    const inno1 = randUuid();
    const inno2 = randUuid();

    beforeEach(async () => {
      jest.spyOn(RecipientsService.prototype, 'userInnovationsWithAssignedRecipients').mockResolvedValueOnce([
        {
          id: inno1,
          name: 'Innovation 1',
          assignedUsers: [DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole')]
        },
        {
          id: inno2,
          name: 'Innovation 2',
          assignedUsers: [
            DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole'),
            DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
          ]
        }
      ]);
    });

    it('should send an in-app to the assigned users', async () => {
      const handler = new LockUserHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        { identityId: lockedUser.identityId },
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.inApp).toMatchObject([
        {
          innovationId: inno1,
          context: {
            type: NotificationCategoryEnum.ADMIN,
            detail: 'AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS',
            id: inno1
          },
          userRoleIds: [scenario.users.ingridAccessor.roles.accessorRole.id],
          params: {}
        },
        {
          innovationId: inno2,
          context: {
            type: NotificationCategoryEnum.ADMIN,
            detail: 'AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS',
            id: inno2
          },
          userRoleIds: [
            scenario.users.ingridAccessor.roles.accessorRole.id,
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id
          ],
          params: {}
        }
      ]);
    });
  });

  describe('AP03_USER_LOCKED_TO_LOCKED_USER', () => {
    it('should send a confirmation email to the locked user', async () => {
      await testEmails(LockUserHandler, 'AP03_USER_LOCKED_TO_LOCKED_USER', {
        notificationPreferenceType: NotificationCategoryEnum.ADMIN,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(lockedUser)],
        inputData: { identityId: lockedUser.identityId },
        outputData: {}
      });
    });

    it("should not send a confirmation email if the user doesn't exist", async () => {
      await testEmails(LockUserHandler, 'AP03_USER_LOCKED_TO_LOCKED_USER', {
        notificationPreferenceType: NotificationCategoryEnum.ADMIN,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [],
        inputData: { identityId: randUuid() },
        outputData: {}
      });
    });
  });
});
