import { LockUserHandler } from './lock-user.handler'; // we need to import this first because of inversify

import { randUuid } from '@ngneat/falso';
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { CompleteScenarioType, MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';

describe('Notifications / _handlers / lock-user suite', () => {
  let testsHelper: NotificationsTestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new NotificationsTestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should return immediately if the user does not exist', async () => {
    const handler = new LockUserHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
      { user: { identityId: randUuid() } },
      MocksHelper.mockContext()
    );

    await handler.run();
    expect(handler.emails.length).toBe(0);
    expect(handler.inApp.length).toBe(0);
  });

  it.each([
    ['johnInnovator' as const],
    ['aliceQualifyingAccessor' as const],
    ['ingridAccessor' as const],
    ['paulNeedsAssessor' as const],
    ['allMighty' as const]
  ])('Should send an email to the %s user that was locked', async (user: keyof CompleteScenarioType['users']) => {
    const lockedUser = scenario.users[user];
    const handler = new LockUserHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
      { user: { identityId: lockedUser.identityId } },
      MocksHelper.mockContext()
    );

    await handler.run();
    expect(handler.emails).toHaveLength(1);
    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.LOCK_USER_TO_LOCKED_USER,
        to: { email: lockedUser.email, displayname: lockedUser.name },
        notificationPreferenceType: null,
        params: {}
      }
    ]);
  });

  it('Should send an inapp to all assigned users of locked user innovations', async () => {
    const lockedUser = scenario.users.johnInnovator;
    const handler = new LockUserHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
      { user: { identityId: lockedUser.identityId } },
      MocksHelper.mockContext()
    );

    const [id1, id2] = [randUuid(), randUuid()];
    jest.spyOn(RecipientsService.prototype, 'userInnovationsWithAssignedRecipients').mockResolvedValue([
      {
        id: id1,
        name: 'Innovation 1',
        assignedUsers: [DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole')]
      },
      {
        id: id2,
        name: 'Innovation 2',
        assignedUsers: [
          DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole'),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
        ]
      }
    ]);

    await handler.run();
    // Not testing emails because it's already tested in the previous test
    expect(handler.inApp).toHaveLength(2); // one for each innovation
    expect(handler.inApp).toMatchObject([
      {
        innovationId: id1,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.LOCK_USER,
          id: id1
        },
        userRoleIds: [scenario.users.ingridAccessor.roles.accessorRole.id],
        params: {}
      },
      {
        innovationId: id2,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.LOCK_USER,
          id: id2
        },
        userRoleIds: [
          scenario.users.ingridAccessor.roles.accessorRole.id,
          scenario.users.aliceQualifyingAccessor.roles.qaRole.id
        ],
        params: {}
      }
    ]);
  });

  it('Should remove duplicate users from the inapp recipients', async () => {
    jest.spyOn(RecipientsService.prototype, 'userInnovationsWithAssignedRecipients').mockResolvedValue([
      {
        id: randUuid(),
        name: 'Innovation 2',
        assignedUsers: [
          DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole'),
          DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole'),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
        ]
      }
    ]);

    const lockedUser = scenario.users.johnInnovator;
    const handler = new LockUserHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
      { user: { identityId: lockedUser.identityId } },
      MocksHelper.mockContext()
    );
    await handler.run();
    expect(handler.inApp?.[0]?.userRoleIds).toMatchObject([
      scenario.users.ingridAccessor.roles.accessorRole.id,
      scenario.users.aliceQualifyingAccessor.roles.qaRole.id
    ]);
  });
});
