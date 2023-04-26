import type { PhoneUserPreferenceEnum } from 'libs/shared/enums';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BaseEntity } from '../base.entity';

import { UserEntity } from './user.entity';

@Entity('user_preference')
export class UserPreferenceEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contact_by_phone', type: 'bit', nullable: false })
  contactByPhone: boolean;

  @Column({ name: 'contact_by_email', type: 'bit', nullable: false })
  contactByEmail: boolean;

  @Column({ name: 'contact_by_phone_timeframe', type: 'nvarchar', nullable: true })
  contactByPhoneTimeframe: null | PhoneUserPreferenceEnum;

  @Column({ name: 'contact_details', type: 'nvarchar', nullable: true })
  contactDetails: string | null;

  @PrimaryColumn({ name: 'user_id', type: 'uniqueidentifier' })
  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  static new(data: Partial<UserPreferenceEntity>): UserPreferenceEntity {
    const instance = new UserPreferenceEntity();
    Object.assign(instance, data);
    return instance;
  }
}
