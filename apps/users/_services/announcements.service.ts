import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserEntity } from '@users/shared/entities';
import type { AnnouncementTemplateType } from '@users/shared/enums';
import type { DomainContextType } from '@users/shared/types';

import { BaseService } from './base.service';

@injectable()
export class AnnouncementsService extends BaseService {
  constructor() {
    super();
  }

  async getUserAnnouncements(requestUser: DomainContextType): Promise<
    {
      id: string;
      title: string;
      template: AnnouncementTemplateType;
      startsAt: Date;
      expiresAt: null | Date;
      params: null | Record<string, unknown>;
    }[]
  > {
    const announcements = await this.sqlConnection.manager
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select([
        'announcement.id',
        'announcement.title',
        'announcement.template',
        'announcement.startsAt',
        'announcement.expiresAt',
        'announcement.params'
      ])
      .leftJoin('announcement.announcementUsers', 'announcementUsers', 'announcementUsers.user_id = :userId', {
        userId: requestUser.id
      })
      .where("CONCAT(',', announcement.user_roles, ',') LIKE :userRole", {
        userRole: `%,${requestUser.currentRole.role},%`
      })
      .andWhere('GETDATE() > announcement.starts_at')
      .andWhere('(announcement.expires_at IS NULL OR GETDATE() < announcement.expires_at)')
      .andWhere('announcementUsers.read_at IS NULL')
      .getMany();

    return announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      template: announcement.template,
      params: announcement.params,
      startsAt: announcement.startsAt,
      expiresAt: announcement.expiresAt
    }));
  }

  async readUserAnnouncement(
    requestUser: DomainContextType,
    announcementId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcementUser = await em
      .createQueryBuilder(AnnouncementUserEntity, 'announcementUser')
      .select(['announcementUser.id'])
      .where('announcementUser.announcement_id = :announcementId', { announcementId })
      .andWhere('announcementUser.user_id = :userId', { userId: requestUser.id })
      .andWhere('announcementUser.read_at IS NOT NULL') // This is not needed, but just making sure
      .getOne();

    if (!announcementUser) {
      await em.save(
        AnnouncementUserEntity,
        AnnouncementUserEntity.new({
          announcement: AnnouncementEntity.new({ id: announcementId }),
          user: UserEntity.new({ id: requestUser.id }),
          readAt: new Date(),
          createdBy: requestUser.id,
          updatedBy: requestUser.id
        })
      );
    }
  }
}
