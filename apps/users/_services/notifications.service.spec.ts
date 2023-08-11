import { container } from '../_config';

import { TestsHelper } from '@users/shared/tests';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import type { NotificationsService } from './notifications.service';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { EmailNotificationPreferenceEnum, NotificationContextTypeEnum } from '@users/shared/enums';
import { NotificationPreferenceEntity, NotificationUserEntity } from '@users/shared/entities';
import { GenericErrorsEnum, NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import { randUuid } from '@ngneat/falso';

describe('Users / _services / notifications service suite', () => {
  let sut: NotificationsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<NotificationsService>(SYMBOLS.NotificationsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getUserActiveNotificationsCounter', () => {
    it('should get the number of unread notifications for the specified user role', async () => {
      const result = await sut.getUserActiveNotificationsCounter(
        scenario.users.johnInnovator.roles.innovatorRole.id,
        em
      );

      expect(result).toBe(2);
    });
  });

  describe('getUserNotifications', () => {
    it('should get all user notifications', async () => {
      const result = await sut.getUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { contextTypes: [], unreadOnly: false },
        { order: { createdAt: 'DESC' }, take: 10, skip: 0 },
        em
      );

      expect(result).toMatchObject({
        total: 2,
        data: [
          {
            id: scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.id,
            innovation: {
              id: scenario.users.johnInnovator.innovations.johnInnovation.id,
              name: scenario.users.johnInnovator.innovations.johnInnovation.name,
              status: scenario.users.johnInnovator.innovations.johnInnovation.status,
              ownerName: scenario.users.johnInnovator.name
            },
            contextType:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.context
                .type,
            contextDetail:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.context
                .detail,
            contextId:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.context.id,
            createdAt: new Date(
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.createdAt
            ),
            readAt: null,
            params: scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.params
          },
          {
            id: scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.id,
            innovation: {
              id: scenario.users.johnInnovator.innovations.johnInnovation.id,
              name: scenario.users.johnInnovator.innovations.johnInnovation.name,
              status: scenario.users.johnInnovator.innovations.johnInnovation.status,
              ownerName: scenario.users.johnInnovator.name
            },
            contextType:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context
                .type,
            contextDetail:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context
                .detail,
            contextId:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context.id,
            createdAt: new Date(
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.createdAt
            ),
            readAt: null,
            params:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.params
          }
        ]
      });
    });

    it('should get all user notifications with the specified contextType', async () => {
      const result = await sut.getUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { contextTypes: [NotificationContextTypeEnum.THREAD], unreadOnly: false },
        { order: { createdAt: 'DESC' }, take: 10, skip: 0 },
        em
      );

      expect(result).toMatchObject({
        total: 1,
        data: [
          {
            id: scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.id,
            innovation: {
              id: scenario.users.johnInnovator.innovations.johnInnovation.id,
              name: scenario.users.johnInnovator.innovations.johnInnovation.name,
              status: scenario.users.johnInnovator.innovations.johnInnovation.status,
              ownerName: scenario.users.johnInnovator.name
            },
            contextType:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context
                .type,
            contextDetail:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context
                .detail,
            contextId:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context.id,
            createdAt: new Date(
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.createdAt
            ),
            readAt: null,
            params:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.params
          }
        ]
      });
    });

    it('should get all unread notifications', async () => {
      //read support notification
      await em.getRepository(NotificationUserEntity).update(
        {
          id: scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport
            .notificationUsers.johnInnovator.id
        },
        { readAt: new Date() }
      );

      const result = await sut.getUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { contextTypes: [], unreadOnly: true },
        { order: { createdAt: 'DESC' }, take: 10, skip: 0 },
        em
      );

      expect(result).toMatchObject({
        total: 1,
        data: [
          {
            id: scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.id,
            innovation: {
              id: scenario.users.johnInnovator.innovations.johnInnovation.id,
              name: scenario.users.johnInnovator.innovations.johnInnovation.name,
              status: scenario.users.johnInnovator.innovations.johnInnovation.status,
              ownerName: scenario.users.johnInnovator.name
            },
            contextType:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context
                .type,
            contextDetail:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context
                .detail,
            contextId:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.context.id,
            createdAt: new Date(
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.createdAt
            ),
            readAt: null,
            params:
              scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationsFromMessage.params
          }
        ]
      });
    });

    it.each(['ASC' as const, 'DESC' as const])('should order by createdAt %s', async orderType => {
      const result = await sut.getUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { contextTypes: [], unreadOnly: false },
        { order: { createdAt: orderType }, take: 10, skip: 0 },
        em
      );

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const ordered = [
        innovation.notifications.notificationFromSupport.createdAt,
        innovation.notifications.notificationsFromMessage.createdAt
      ].sort();

      expect(result.data.map(n => n.createdAt.toISOString())).toEqual(
        orderType === 'ASC' ? ordered : ordered.reverse()
      );
    });
  });

  describe('deleteUserNotification', () => {
    it('should delete the notification', async () => {
      const notificationUser =
        scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.notificationUsers
          .johnInnovator;

      await sut.deleteUserNotification(
        scenario.users.johnInnovator.roles.innovatorRole.id,
        scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport.id,
        em
      );

      const dbNotificationUser = await em
        .createQueryBuilder(NotificationUserEntity, 'notification_user')
        .withDeleted()
        .where('notification_user.id = :notificationUserId', { notificationUserId: notificationUser.id })
        .getOne();

      expect(dbNotificationUser?.deletedAt).toBeTruthy();
    });
  });

  describe('dismissUserNotifications', () => {
    it('should dismiss the specified notifications', async () => {
      const notificationToDismiss =
        scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport;

      const result = await sut.dismissUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          notificationIds: [notificationToDismiss.id],
          contextIds: [],
          contextTypes: [],
          dismissAll: false
        },
        em
      );

      expect(result).toBe(1);

      const dbNotificationUser = await em
        .createQueryBuilder(NotificationUserEntity, 'notification_user')
        .where('notification_user.id = :notificationUserId', {
          notificationUserId: notificationToDismiss.notificationUsers.johnInnovator.id
        })
        .getOne();

      expect(dbNotificationUser?.readAt).toBeTruthy();
    });

    it('should dismiss the notifications with the specified contextId', async () => {
      const notificationToDismiss =
        scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport;

      const result = await sut.dismissUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          notificationIds: [],
          contextIds: [notificationToDismiss.context.id],
          contextTypes: [],
          dismissAll: false
        },
        em
      );

      expect(result).toBe(1);

      const dbNotificationUser = await em
        .createQueryBuilder(NotificationUserEntity, 'notification_user')
        .where('notification_user.id = :notificationUserId', {
          notificationUserId: notificationToDismiss.notificationUsers.johnInnovator.id
        })
        .getOne();

      expect(dbNotificationUser?.readAt).toBeTruthy();
    });

    it('should dismiss the notifications with the specified contextType', async () => {
      const notificationToDismiss =
        scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport;

      const result = await sut.dismissUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          notificationIds: [],
          contextIds: [],
          contextTypes: [notificationToDismiss.context.type],
          dismissAll: false
        },
        em
      );

      expect(result).toBe(1);

      const dbNotificationUser = await em
        .createQueryBuilder(NotificationUserEntity, 'notification_user')
        .where('notification_user.id = :notificationUserId', {
          notificationUserId: notificationToDismiss.notificationUsers.johnInnovator.id
        })
        .getOne();

      expect(dbNotificationUser?.readAt).toBeTruthy();
    });

    it('should dismiss all notifications', async () => {
      const result = await sut.dismissUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          notificationIds: [],
          contextIds: [],
          contextTypes: [],
          dismissAll: true
        },
        em
      );

      expect(result).toBe(2);

      const dbNotificationUsers = await em
        .createQueryBuilder(NotificationUserEntity, 'notification_user')
        .innerJoin('notification_user.userRole', 'userRole')
        .where('userRole.id = :userRoleId', { userRoleId: scenario.users.johnInnovator.roles.innovatorRole.id })
        .getMany();

      dbNotificationUsers.forEach(notificationUser => {
        expect(notificationUser.readAt).toBeTruthy();
      });
    });

    it('should throw an error if dismissAll is false and no other parameters are given', async () => {
      await expect(() =>
        sut.dismissUserNotifications(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          {
            notificationIds: [],
            contextIds: [],
            contextTypes: [],
            dismissAll: false
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(GenericErrorsEnum.INVALID_PAYLOAD, {
          message:
            'Either dismissAll is true or at least one of the following fields must have elements: notificationIds, contextTypes, contextIds'
        })
      );
    });
  });

  describe('getUserRoleEmailPreferences', () => {
    it('should get the email preferences for the specified role', async () => {
      //create preference
      await em.getRepository(NotificationPreferenceEntity).save({
        notificationType: 'ACTION',
        preference: EmailNotificationPreferenceEnum.DAILY,
        userRoleId: scenario.users.adamInnovator.roles.innovatorRole.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await sut.getUserRoleEmailPreferences(scenario.users.adamInnovator.roles.innovatorRole.id, em);

      expect(result).toMatchObject([
        {
          notificationType: 'ACTION',
          preference: EmailNotificationPreferenceEnum.DAILY
        },
        {
          notificationType: 'SUPPORT',
          preference: EmailNotificationPreferenceEnum.INSTANTLY
        },
        {
          notificationType: 'MESSAGE',
          preference: EmailNotificationPreferenceEnum.INSTANTLY
        }
      ]);
    });
  });

  describe('upsertEmailPreferences', () => {
    it(`should create email preferences if they don't exist`, async () => {
      await sut.upsertUserEmailPreferences(
        scenario.users.adamInnovator.roles.innovatorRole.id,
        [
          {
            notificationType: 'ACTION',
            preference: EmailNotificationPreferenceEnum.DAILY
          }
        ],
        em
      );

      const dbPreference = await em
        .createQueryBuilder(NotificationPreferenceEntity, 'notificationPreference')
        .where('notificationPreference.userRoleId = :userRoleId', {
          userRoleId: scenario.users.adamInnovator.roles.innovatorRole.id
        })
        .andWhere('notificationPreference.notificationType = :notificationType', { notificationType: 'ACTION' })
        .getOne();

      expect(dbPreference?.preference).toBe(EmailNotificationPreferenceEnum.DAILY);
    });

    it('should update existing email preferences', async () => {
      //create preference
      await em.getRepository(NotificationPreferenceEntity).save({
        notificationType: 'SUPPORT',
        preference: EmailNotificationPreferenceEnum.DAILY,
        userRoleId: scenario.users.adamInnovator.roles.innovatorRole.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await sut.upsertUserEmailPreferences(
        scenario.users.adamInnovator.roles.innovatorRole.id,
        [
          {
            notificationType: 'SUPPORT',
            preference: EmailNotificationPreferenceEnum.NEVER
          }
        ],
        em
      );

      const dbPreference = await em
        .createQueryBuilder(NotificationPreferenceEntity, 'notificationPreference')
        .where('notificationPreference.userRoleId = :userRoleId', {
          userRoleId: scenario.users.adamInnovator.roles.innovatorRole.id
        })
        .andWhere('notificationPreference.notificationType = :notificationType', { notificationType: 'SUPPORT' })
        .getOne();

      expect(dbPreference?.preference).toBe(EmailNotificationPreferenceEnum.NEVER);
    });

    it(`should throw an error if the specified user role doesn't exist`, async () => {
      await expect(() =>
        sut.upsertUserEmailPreferences(
          randUuid(),
          [
            {
              notificationType: 'SUPPORT',
              preference: EmailNotificationPreferenceEnum.NEVER
            }
          ],
          em
        )
      ).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));
    });
  });
});
