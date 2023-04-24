import { AnnouncementUserEntity } from '@users/shared/entities/user/announcement-user.entity';
import type { AnnouncementTemplateType, ServiceRoleEnum } from '@users/shared/enums';
import { NotFoundError, UserErrorsEnum } from '@users/shared/errors';
import type { DomainContextType } from '@users/shared/types';
import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';


@injectable()
export class AnnouncementsService extends BaseService {

  constructor() {
    super();
  }

  async getAnnouncements(
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{
    id: string,
    template: AnnouncementTemplateType,
    targetRoles: ServiceRoleEnum[],
    params: Record<string, unknown> | null,
    createdAt: Date
  }[]> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbAnnouncements = await connection.createQueryBuilder(AnnouncementUserEntity, 'announcementUser')
      .select(['announcement.id', 'announcement.template', 'announcement.targetRoles', 'announcement.params', 'announcement.startsAt', 'announcementUser.id'])
      .innerJoin('announcementUser.announcement', 'announcement')
      .where('announcementUser.user_id = :userId', { userId: domainContext.id })
      .andWhere('announcementUser.read_at IS NULL')
      .andWhere('GETDATE() > announcement.starts_at')
      .andWhere('(announcement.expires_at IS NULL OR GETDATE() < announcement.expires_at)')
      .getMany();

    const announcements = dbAnnouncements.filter((announcementUser) => announcementUser.announcement.targetRoles.includes(domainContext.currentRole.role));

    if (!announcements.length) {
      return [];
    }

    return announcements.map(({ announcement }) => ({
      id: announcement.id,
      template: announcement.template,
      params: announcement.params,
      targetRoles: announcement.targetRoles,
      createdAt: announcement.startsAt
    }));
  }

  async readAnnouncement(
    domainContext: DomainContextType,
    announcementId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const userAnnouncement = await connection.createQueryBuilder(AnnouncementUserEntity, 'announcement')
      .select(['announcement.id', 'announcement.targetRoles'])
      .where('announcement.announcement_id = :announcementId', { announcementId })
      .andWhere('announcement.user_id = :userId', { userId: domainContext.id })
      .getOne();

    if (!userAnnouncement || !userAnnouncement.targetRoles.includes(domainContext.currentRole.role)) {
      throw new NotFoundError(UserErrorsEnum.USER_ANNOUNCEMENT_NOT_FOUND);
    }

    await connection.createQueryBuilder().update(AnnouncementUserEntity)
      .set({ readAt: new Date().toISOString() })
      .where('id = :announcementId', { announcementId: userAnnouncement.id })
      .execute();
  }

}
