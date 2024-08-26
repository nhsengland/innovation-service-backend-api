import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { ServiceRoleEnum } from '../../enums/user.enums';
import { AnnouncementTemplateType, AnnouncementTypeEnum } from '../../enums/announcement.enums';

import { AnnouncementUserEntity } from './announcement-user.entity';
import { InnovationEntity } from '../innovation/innovation.entity';

@Entity('announcement')
export class AnnouncementEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', type: 'nvarchar', length: 100 })
  title: string;

  @Column({ name: 'template', type: 'simple-enum', length: 100, enum: AnnouncementTemplateType })
  template: AnnouncementTemplateType;

  @Column({ name: 'user_roles', type: 'simple-array' })
  userRoles: ServiceRoleEnum[];

  @Column({ name: 'starts_at', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expiresAt: null | Date;

  @Column({ name: 'params', type: 'simple-json', nullable: true })
  params: null | Record<string, unknown>;

  @Column({ name: 'type', type: 'simple-enum', enum: AnnouncementTypeEnum })
  type: AnnouncementTypeEnum;

  @OneToMany(() => AnnouncementUserEntity, record => record.announcement, { cascade: ['insert', 'update'] })
  announcementUsers: AnnouncementUserEntity[];

  @ManyToMany(() => InnovationEntity, record => record.announcements)
  @JoinTable({
    name: 'announcement_innovation',
    joinColumn: {
      name: 'announcement_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'innovation_id',
      referencedColumnName: 'id'
    }
  })
  innovations: InnovationEntity[];

  static new(data: Partial<AnnouncementEntity>): AnnouncementEntity {
    const instance = new AnnouncementEntity();
    Object.assign(instance, data);
    return instance;
  }
}
