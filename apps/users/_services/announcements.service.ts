import { AnnouncementUserEntity } from '@users/shared/entities/user/announcement-user.entity';
import type { AnnouncementTemplateType, ServiceRoleEnum } from '@users/shared/enums';
import type { DateISOType, DomainContextType } from '@users/shared/types';
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
    createdAt: DateISOType
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

}
