import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserRoleEntity } from '@users/shared/entities';
import { AnnouncementStatusEnum, AnnouncementTypeEnum } from '@users/shared/enums';
import type { DomainContextType } from '@users/shared/types';

import { BaseService } from './base.service';
import { AnnouncementErrorsEnum, NotFoundError } from '@users/shared/errors';

@injectable()
export class AnnouncementsService extends BaseService {
  constructor() {
    super();
  }

  async getUserRoleAnnouncements(
    userRoleId: string,
    filters: {
      type?: AnnouncementTypeEnum[];
    },
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      title: string;
      startsAt: Date;
      expiresAt: null | Date;
      params: null | Record<string, unknown>;
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbUserRole = await connection
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['userRole.id', 'userRole.role', 'userRole.createdAt', 'user.id'])
      .innerJoin('userRole.user', 'user')
      .where('userRole.id = :roleId', { roleId: userRoleId })
      .getOne();

    if (!dbUserRole) {
      return [];
    }

    const query = connection
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select([
        'announcement.id',
        'announcement.title',
        'announcement.startsAt',
        'announcement.expiresAt',
        'announcement.params'
      ])
      .leftJoin('announcement.announcementUsers', 'announcementUsers', 'announcementUsers.user_id = :userId', {
        userId: dbUserRole.user.id
      })
      .where("CONCAT(',', announcement.user_roles, ',') LIKE :userRole", {
        userRole: `%,${dbUserRole.role},%`
      })
      .andWhere('announcement.starts_at > :createdAtUserRole', { createdAtUserRole: dbUserRole.createdAt })
      .andWhere('GETDATE() > announcement.starts_at')
      .andWhere('(announcement.expires_at IS NULL OR GETDATE() < announcement.expires_at)')
      .andWhere('announcementUsers.read_at IS NULL');

    if (filters.type) {
      query.andWhere('announcement.type IN (:...type) ', { type: filters.type });
    }

    const announcements = await query.getMany();

    return announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      params: announcement.params,
      startsAt: announcement.startsAt,
      expiresAt: announcement.expiresAt
    }));
  }

  async readUserAnnouncement(
    domainContext: DomainContextType,
    announcementId: string,
    innovationId?: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcement = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select(['announcement.id'])
      .where('announcement.id = :announcementId', { announcementId })
      .andWhere('announcement.status = :announcementActive', { announcementActive: AnnouncementStatusEnum.ACTIVE })
      .getOne();
    if (!announcement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }

    await em.update(
      AnnouncementUserEntity,
      {
        announcement: { id: announcementId },
        user: { id: domainContext.id },
        ...(innovationId && { innovation: { id: innovationId } })
      },
      { readAt: new Date(), updatedBy: domainContext.id, updatedAt: new Date() }
    );
  }
}
