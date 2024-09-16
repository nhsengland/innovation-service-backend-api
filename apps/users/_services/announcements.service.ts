import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity } from '@users/shared/entities';
import {
  AnnouncementParamsType,
  AnnouncementStatusEnum,
  AnnouncementTypeEnum,
  ServiceRoleEnum
} from '@users/shared/enums';
import type { DomainContextType } from '@users/shared/types';

import { BaseService } from './base.service';
import { AnnouncementErrorsEnum, NotFoundError } from '@users/shared/errors';

@injectable()
export class AnnouncementsService extends BaseService {
  constructor() {
    super();
  }

  async getUserRoleAnnouncements(
    domainContext: DomainContextType,
    filters: { type?: AnnouncementTypeEnum[]; innovationId?: string },
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      title: string;
      startsAt: Date;
      expiresAt: null | Date;
      params: null | AnnouncementParamsType;
      innovations?: string[];
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(AnnouncementEntity, 'a')
      .select(['a.id', 'a.title', 'a.startsAt', 'a.expiresAt', 'a.params', 'au.id', 'i.name'])
      .innerJoin('a.announcementUsers', 'au', 'au.user_id = :userId AND au.read_at IS NULL', {
        userId: domainContext.id
      })
      .leftJoin('au.innovation', 'i')
      .where('a.status = :activeStatus', { activeStatus: AnnouncementStatusEnum.ACTIVE })
      .andWhere("CONCAT(',', a.user_roles, ',') LIKE :userRole", {
        userRole: `%,${domainContext.currentRole.role},%`
      });

    if (filters.type?.length) {
      query.andWhere('a.type IN (:...types)', { types: filters.type });
    }

    if (filters.innovationId) {
      query.andWhere('au.innovation_id = :innovationId', { innovationId: filters.innovationId });
    }

    const announcements = await query.getMany();

    return announcements.map(announcement => {
      const innovations = new Set(
        announcement.announcementUsers.filter(au => au.innovation?.name).map(au => au.innovation!.name)
      );
      return {
        id: announcement.id,
        title: announcement.title,
        params: announcement.params,
        startsAt: announcement.startsAt,
        expiresAt: announcement.expiresAt,
        ...(!filters.innovationId && innovations.size && { innovations: Array.from(innovations) })
      };
    });
  }

  async hasAnnouncementsToReadByRole(
    userId: string,
    type: AnnouncementTypeEnum[],
    entityManager?: EntityManager
  ): Promise<{ [k: string]: boolean }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcements = await em
      .createQueryBuilder(AnnouncementEntity, 'a')
      .select(['a.id', 'a.userRoles'])
      .innerJoin('a.announcementUsers', 'au', 'au.user_id = :userId AND au.read_at IS NULL', { userId })
      .where('a.status = :activeStatus', { activeStatus: AnnouncementStatusEnum.ACTIVE })
      .andWhere('a.type IN (:...type)', { type })
      .getMany();

    const out = new Map<ServiceRoleEnum, boolean>();
    for (const announcement of announcements) {
      for (const role of announcement.userRoles) {
        out.set(role, true);
      }
    }

    return Object.fromEntries(out.entries());
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
