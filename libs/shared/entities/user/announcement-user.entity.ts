import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { AnnouncementEntity } from './announcement.entity';

import type { ServiceRoleEnum } from '../../enums';
import type { DateISOType } from '../../types/date.types';
import { UserEntity } from './user.entity';

@Entity('announcement_user')
export class AnnouncementUserEntity {

  @PrimaryColumn({ name: 'id', type: 'bigint', generated: true })
  id: number;

  @Column({ name: 'target_roles', type: 'simple-array' })
  targetRoles: ServiceRoleEnum[];

  @Column({ name: 'read_at', type: 'datetime2', nullable: true })
  readAt: DateISOType | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt: DateISOType | null;

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
