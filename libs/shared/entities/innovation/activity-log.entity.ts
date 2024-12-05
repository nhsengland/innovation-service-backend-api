import { Column, DeepPartial, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserRoleEntity } from '../user/user-role.entity';
import { InnovationEntity } from './innovation.entity';

import { ActivityEnum, ActivityTypeEnum } from '../../enums/activity.enums';
import { ActivityLogDBParamsType } from '../../types';

@Entity('activity_log')
export class ActivityLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type' })
  type: ActivityTypeEnum;

  @Column({ name: 'activity' })
  activity: ActivityEnum;

  @ManyToOne(() => UserRoleEntity)
  @JoinColumn({ name: 'user_role_id' })
  userRole: UserRoleEntity;

  @Column({ name: 'param', type: 'simple-json' })
  param: ActivityLogDBParamsType;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  static new(data: DeepPartial<ActivityLogEntity>): ActivityLogEntity {
    const instance = new ActivityLogEntity();
    Object.assign(instance, data);
    return instance;
  }
}
