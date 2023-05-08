import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { ServiceRoleEnum } from '../../enums';
import { AnnouncementTemplateType } from '../../enums/announcement.enums';

import { AnnouncementUserEntity } from './announcement-user.entity';

@Entity('announcement')
export class AnnouncementEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template', type: 'simple-enum', enum: AnnouncementTemplateType })
  template: AnnouncementTemplateType;

  @Column({ name: 'target_roles', type: 'simple-array' })
  targetRoles: ServiceRoleEnum[];

  @Column({ name: 'params', type: 'simple-json', nullable: true })
  params: Record<string, unknown> | null;

  @Column({ name: 'starts_at', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expiresAt: Date | null;

  @OneToMany(() => AnnouncementUserEntity, record => record.announcement, {
    cascade: ['insert', 'update']
  })
  announcementUsers: AnnouncementUserEntity[];

  static new(data: Partial<AnnouncementEntity>): AnnouncementEntity {
    const instance = new AnnouncementEntity();
    Object.assign(instance, data);
    return instance;
  }
}
