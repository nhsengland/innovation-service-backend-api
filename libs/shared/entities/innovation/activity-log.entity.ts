import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from './innovation.entity';

import { ActivityEnum, ActivityTypeEnum } from '../../enums/activity.enums';


@Entity('activity_log')
export class ActivityLogEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type' })
  type: ActivityTypeEnum;

  @Column({ name: 'activity' })
  activity: ActivityEnum;

  @Column({ name: 'param' })
  param: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<ActivityLogEntity>): ActivityLogEntity {
    const instance = new ActivityLogEntity();
    Object.assign(instance, data);
    return instance;
  }

}
