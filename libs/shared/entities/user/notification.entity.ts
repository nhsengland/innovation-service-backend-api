import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';
import { NotificationUserEntity } from './notification-user.entity';

import {
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '../../enums/notification.enums';

@Entity('notification')
export class NotificationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column({ name: 'message' })
  // message: string;

  @Column({ name: 'context_type' })
  contextType: NotificationContextTypeEnum | NotificationCategoryEnum;

  @Column({ name: 'context_detail' })
  contextDetail: NotificationContextDetailEnum;

  @Column({ type: 'uuid', name: 'context_id' })
  contextId: string;

  @Column({ name: 'params', type: 'simple-json' })
  params: Record<string, unknown>;

  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;

  @OneToMany(() => NotificationUserEntity, record => record.notification, {
    lazy: true,
    cascade: ['insert', 'update']
  })
  notificationUsers: Promise<NotificationUserEntity[]>;

  static new(data: Partial<NotificationEntity>): NotificationEntity {
    const instance = new NotificationEntity();
    Object.assign(instance, data);
    return instance;
  }
}
