import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserEntity, UserRoleEntity } from '@users/shared/entities';
import type { AnnouncementTemplateType } from '@users/shared/enums';
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
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      title: string;
      template: AnnouncementTemplateType;
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

    const announcements = await connection
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
        userId: dbUserRole.user.id
      })
      .where("CONCAT(',', announcement.user_roles, ',') LIKE :userRole", {
        userRole: `%,${dbUserRole.role},%`
      })
      .andWhere('announcement.starts_at > :createdAtUserRole', { createdAtUserRole: dbUserRole.createdAt })
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

    const announcement = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .where('announcement.id = :announcementId', { announcementId })
      .getOne();

    if (!announcement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }

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
