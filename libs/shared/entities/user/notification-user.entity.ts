import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { NotificationEntity } from './notification.entity';
import { UserEntity } from './user.entity';

import type { DateISOType } from '../../types/date.types';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';


@Entity('notification_user')
export class NotificationUserEntity extends BaseEntity {

  @Column({ name: 'read_at', type: 'datetime2', nullable: true })
  readAt: DateISOType;


  @PrimaryColumn({ name: 'notification_id', type: 'uniqueidentifier' })
  @ManyToOne(() => NotificationEntity)
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @PrimaryColumn({ name: 'user_id', type: 'uniqueidentifier' })
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => OrganisationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'organisation_unit_id' })
  organisationUnit: undefined | OrganisationUnitEntity;

  static new(data: Partial<NotificationUserEntity>): NotificationUserEntity {
    const instance = new NotificationUserEntity();
    Object.assign(instance, data);
    return instance;
  }

}
