 
import type { EntityManager } from 'typeorm';
import { BaseBuilder } from './base.builder';
import type { ActivityEnum, ActivityTypeEnum } from '../../enums';
import { InnovationEntity, ActivityLogEntity, UserRoleEntity } from '../../entities';
import type { TestUserType } from './user.builder';

export type TestActivityLogType = {
  id: string;
  type: ActivityTypeEnum;
  activity: ActivityEnum;
  param: Record<string, unknown>;
  createdAt: Date;
};

export class ActivityLogBuilder extends BaseBuilder {
  private activityLogEntry: Partial<ActivityLogEntity> = {
    param: {}
  };

  private actionUserName: string;
  private interveningUserName: string;

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setType(type: ActivityTypeEnum): this {
    this.activityLogEntry.type = type;
    return this;
  }

  setActivity(activity: ActivityEnum): this {
    this.activityLogEntry.activity = activity;
    return this;
  }

  setInnovation(innovationId: string): this {
    this.activityLogEntry.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  setCreatedAt(createdAt: Date): this {
    this.activityLogEntry.createdAt = createdAt;
    return this;
  }

  setCreatedBy<T extends TestUserType>(user: T, userRoleKey?: keyof T['roles']): this {
    this.activityLogEntry.createdBy = user.id;
    this.activityLogEntry.userRole = userRoleKey
      ? UserRoleEntity.new({ id: user.roles[userRoleKey as string]!.id })
      : UserRoleEntity.new({ id: Object.values(user.roles)[0]!.id });
    this.actionUserName = user.name;
    return this;
  }

  setInterveningUser(user: TestUserType): this {
    this.interveningUserName = user.name;
    return this;
  }

  async save(): Promise<TestActivityLogType> {
    const savedActivity = await this.getEntityManager()
      .getRepository(ActivityLogEntity)
      .save({
        ...this.activityLogEntry,
        param: {
          actionUserName: this.actionUserName,
          interveningUserName: this.interveningUserName
        }
      });

    const result = await this.getEntityManager()
      .createQueryBuilder(ActivityLogEntity, 'activity')
      .where('activity.id = :activityId', { activityId: savedActivity.id })
      .getOne();

    if (!result) {
      throw new Error('ActivityLogBuilder::save:: Error saving/retriving acticity log information.');
    }

    return {
      id: result.id,
      type: result.type,
      activity: result.activity,
      param: result.param,
      createdAt: result.createdAt
    };
  }
}
