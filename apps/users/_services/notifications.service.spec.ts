import { container } from '../_config';

import { NotificationPreferenceEntity, NotificationUserEntity } from '@users/shared/entities';
import { NotificationPreferenceEnum, ServiceRoleEnum } from '@users/shared/enums';
import { GenericErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import { TestsHelper } from '@users/shared/tests';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { NaNotificationCategories, QANotificationCategories, generatePreferencesObject } from '@users/shared/types';
import type { EntityManager } from 'typeorm';
import type { NotificationsService } from './notifications.service';
import SYMBOLS from './symbols';

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

      result.data.sort((a, b) => a.id.localeCompare(b.id));

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
        ].sort((a, b) => a.id.localeCompare(b.id))
      });
    });

    it('should get all user notifications with the specified contextType', async () => {
      const result = await sut.getUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        { contextTypes: ['MESSAGES'], unreadOnly: false },
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
          contextDetails: [],
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
          contextDetails: [],
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
          contextDetails: [],
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

    it('should dismiss the notifications with the specified contextDetail', async () => {
      const notificationToDismiss =
        scenario.users.johnInnovator.innovations.johnInnovation.notifications.notificationFromSupport;

      const result = await sut.dismissUserNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          notificationIds: [],
          contextIds: [],
          contextTypes: [],
          contextDetails: [notificationToDismiss.context.detail],
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
          contextDetails: [],
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
            contextDetails: [],
            dismissAll: false
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(GenericErrorsEnum.INVALID_PAYLOAD, {
          message:
            'Either dismissAll is true or at least one of the following fields must have elements: notificationIds, contextTypes, contextDetails, contextIds'
        })
      );
    });
  });

  describe('getUserRoleEmailPreferences', () => {
    it('should get the email preferences for the specified role', async () => {
      const mockNaPreferences = generatePreferencesObject<ServiceRoleEnum.ASSESSMENT>(NaNotificationCategories);

      //create preference
      await em.getRepository(NotificationPreferenceEntity).save({
        notificationType: 'TASK',
        preferences: mockNaPreferences,
        userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        updatedBy: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
      });

      const result = await sut.getUserRoleEmailPreferences(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        em
      );

      expect(result).toMatchObject(mockNaPreferences);
    });

    it('should return the default email preferences for the specified role', async () => {
      const result = await sut.getUserRoleEmailPreferences(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        em
      );

      expect(result).toMatchObject(
        generatePreferencesObject<ServiceRoleEnum.QUALIFYING_ACCESSOR>(QANotificationCategories)
      );
    });

    it("should return possible new categories even if the user didn't setted it yet", async () => {
      const mockNaPreferences = generatePreferencesObject<ServiceRoleEnum.ASSESSMENT>(NaNotificationCategories);
      mockNaPreferences['INNOVATION_MANAGEMENT'] = undefined as unknown as NotificationPreferenceEnum;

      //create preference
      await em.getRepository(NotificationPreferenceEntity).save({
        notificationType: 'TASK',
        preferences: mockNaPreferences,
        userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        updatedBy: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
      });

      const result = await sut.getUserRoleEmailPreferences(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        em
      );

      expect(result).toMatchObject({
        ...mockNaPreferences,
        INNOVATION_MANAGEMENT: NotificationPreferenceEnum.YES
      });
    });
  });

  describe('upsertEmailPreferences', () => {
    const mockNaPreferences = generatePreferencesObject<ServiceRoleEnum.ASSESSMENT>(NaNotificationCategories);

    it(`should create email preferences if they don't exist`, async () => {
      await sut.upsertUserEmailPreferences(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        { preferences: mockNaPreferences },
        em
      );

      const dbPreference = await em
        .createQueryBuilder(NotificationPreferenceEntity, 'preference')
        .where('preference.userRoleId = :userRoleId', {
          userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
        })
        .getOne();

      expect(dbPreference?.preferences).toMatchObject(mockNaPreferences);
    });

    it('should update existing email preferences', async () => {
      // create preference
      await em.getRepository(NotificationPreferenceEntity).save({
        preferences: mockNaPreferences,
        userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        updatedBy: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
      });

      const expected = { ...mockNaPreferences, MESSAGES: NotificationPreferenceEnum.NO };

      await sut.upsertUserEmailPreferences(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        { preferences: expected },
        em
      );

      const dbPreference = await em
        .createQueryBuilder(NotificationPreferenceEntity, 'preference')
        .where('preference.userRoleId = :userRoleId', {
          userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
        })
        .getOne();

      expect(dbPreference?.preferences).toMatchObject(expected);
    });
  });
});
