/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { EntityManager } from 'typeorm';
import { InnovationEntity, NotificationEntity, UserRoleEntity } from '../../entities';
import { NotificationUserEntity } from '../../entities/user/notification-user.entity';
import type { NotificationCategoryType, NotificationDetailType } from '../../enums';
import { BaseBuilder } from './base.builder';
import type { TestUserType } from './user.builder';

export type TestNotificationType = {
  id: string;
  context: { detail: NotificationDetailType; type: NotificationCategoryType; id: string };
  createdAt: Date;
  notificationUsers: Map<string, { id: number; readAt: Date | null }>;
  params: Record<string, unknown>;
};

export class NotificationBuilder extends BaseBuilder {
  private notificationUsers: Partial<NotificationUserEntity>[] = [];
  private notification: Partial<NotificationEntity> = {
    params: {}
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setContext(type: NotificationCategoryType, detail: NotificationDetailType, id: string): this {
    this.notification.contextType = type;
    this.notification.contextDetail = detail;
    this.notification.contextId = id;
    return this;
  }

  setInnovation(innovationId: string): this {
    this.notification.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  addNotificationUser<T extends TestUserType>(user: T, userRoleKey?: keyof T['roles'], readAt?: Date): this {
    if (!userRoleKey) {
      if (Object.keys(user.roles).length === 1) {
        userRoleKey = Object.keys(user.roles)[0]!;
      } else {
        throw new Error(
          'NotificationBuilder::addNotificationUser: More than 1 role, needs userRoleKey parameter defined.'
        );
      }
    }

    const role = user.roles[userRoleKey as string];
    if (!role) {
      throw new Error('NotificationBuilder::addNotificationUser: User role not found.');
    }

    this.notificationUsers.push({
      userRole: UserRoleEntity.new({ id: role.id }),
      readAt: readAt
    });

    return this;
  }

  async save(): Promise<TestNotificationType> {
    const savedNotification = await this.getEntityManager().getRepository(NotificationEntity).save(this.notification);

    const result = await this.getEntityManager()
      .createQueryBuilder(NotificationEntity, 'notification')
      .where('notification.id = :notificationId', { notificationId: savedNotification.id })
      .getOne();

    if (!result) {
      throw new Error('NotificationBuilder::save:: Error saving/retriving notification information.');
    }

    const savedNotificationUsers = await this.getEntityManager()
      .getRepository(NotificationUserEntity)
      .save(
        this.notificationUsers.map(notificationUser => ({
          ...notificationUser,
          notification: NotificationEntity.new({ id: savedNotification.id })
        }))
      );

    const resultNotificationUsers = await this.getEntityManager()
      .createQueryBuilder(NotificationUserEntity, 'notificationUser')
      .innerJoinAndSelect('notificationUser.userRole', 'role')
      .where('notificationUser.id IN (:...notificationUserIds)', {
        notificationUserIds: savedNotificationUsers.map(nU => nU.id)
      })
      .getMany();

    if (!resultNotificationUsers.length) {
      throw new Error('NotificationBuilder::save:: Error saving/retriving notification users information.');
    }

    return {
      id: result.id,
      context: { detail: result.contextDetail, type: result.contextType, id: result.contextId },
      notificationUsers: new Map(
        resultNotificationUsers.map(notificationUser => [
          notificationUser.userRole.id,
          { id: notificationUser.id, readAt: notificationUser.readAt }
        ])
      ),
      createdAt: result.createdAt,
      params: result.params
    };
  }
}
