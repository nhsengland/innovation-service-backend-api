import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { AnnouncementEntity } from './announcement.entity';
import { UserEntity } from './user.entity';

@Entity('announcement_user')
export class AnnouncementUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'read_at', type: 'datetime2' })
  readAt: Date;

  @ManyToOne(() => AnnouncementEntity)
  @JoinColumn({ name: 'announcement_id' })
  announcement: AnnouncementEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  static new(data: Partial<AnnouncementUserEntity>): AnnouncementUserEntity {
    const instance = new AnnouncementUserEntity();
    Object.assign(instance, data);
    return instance;
  }
}
