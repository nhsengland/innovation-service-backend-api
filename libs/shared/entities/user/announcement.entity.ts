import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import type { ServiceRoleEnum } from '../../enums/user.enums';
import { AnnouncementParamsType, AnnouncementStatusEnum, AnnouncementTypeEnum } from '../../enums/announcement.enums';

import { AnnouncementUserEntity } from './announcement-user.entity';
import type { FilterPayload } from '../../models/schema-engine/schema.model';

@Entity('announcement')
export class AnnouncementEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'status', type: 'simple-enum', enum: AnnouncementStatusEnum })
  status: AnnouncementStatusEnum;

  @Column({ name: 'title', type: 'nvarchar', length: 100 })
  title: string;

  @Column({ name: 'user_roles', type: 'simple-array' })
  userRoles: ServiceRoleEnum[];

  @Column({ name: 'starts_at', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expiresAt: null | Date;

  @Column({ name: 'params', type: 'simple-json', nullable: false })
  params: AnnouncementParamsType;

  @Column({ name: 'type', type: 'simple-enum', enum: AnnouncementTypeEnum })
  type: AnnouncementTypeEnum;

  @Column({ name: 'filters', type: 'simple-json', nullable: true })
  filters: null | FilterPayload[];

  @Column({ name: 'send_email', type: 'bit', default: false })
  sendEmail: boolean;

  @OneToMany(() => AnnouncementUserEntity, record => record.announcement, { cascade: ['insert', 'update'] })
  announcementUsers: AnnouncementUserEntity[];

  static new(data: Partial<AnnouncementEntity>): AnnouncementEntity {
    const instance = new AnnouncementEntity();
    Object.assign(instance, data);
    return instance;
  }
}
