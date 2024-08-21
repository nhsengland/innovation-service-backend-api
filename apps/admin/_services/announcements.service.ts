import { injectable } from 'inversify';
import { EntityManager, In } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserEntity } from '@admin/shared/entities';
import {
  AnnouncementParamsType,
  AnnouncementStatusEnum,
  AnnouncementTypeEnum,
  ServiceRoleEnum
} from '@admin/shared/enums';
import { AnnouncementErrorsEnum, BadRequestError, NotFoundError, UnprocessableEntityError } from '@admin/shared/errors';
import { JoiHelper, PaginationQueryParamsType } from '@admin/shared/helpers';
import type { DomainContextType } from '@admin/shared/types';

import {
  AnnouncementActiveBodySchema,
  AnnouncementActiveBodyType,
  AnnouncementScheduledBodySchema,
  AnnouncementScheduledBodyType
} from './announcements.schemas';
import { BaseService } from './base.service';
import { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

@injectable()
export class AnnouncementsService extends BaseService {
  constructor() {
    super();
  }

  async getAnnouncementsList(
    pagination: PaginationQueryParamsType<never>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      title: string;
      userRoles: ServiceRoleEnum[];
      params: null | Record<string, unknown>;
      startsAt: Date;
      expiresAt: null | Date;
      status: AnnouncementStatusEnum;
      type: AnnouncementTypeEnum;
      filters: null | FilterPayload[];
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const [dbAnnouncements, dbCount] = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .withDeleted()
      .select([
        'announcement.id',
        'announcement.title',
        'announcement.userRoles',
        'announcement.params',
        'announcement.startsAt',
        'announcement.expiresAt',
        'announcement.type',
        'announcement.deletedAt'
      ])
      .skip(pagination.skip)
      .take(pagination.take)
      .addOrderBy('announcement.startsAt', 'DESC')
      .getManyAndCount();

    return {
      count: dbCount,
      data: dbAnnouncements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        userRoles: announcement.userRoles,
        params: announcement.params,
        startsAt: announcement.startsAt,
        expiresAt: announcement.expiresAt,
        status: this.getAnnouncementStatus(announcement.startsAt, announcement.expiresAt, announcement.deletedAt),
        type: announcement.type,
        filters: announcement.filters
      }))
    };
  }

  async getAnnouncementInfo(
    announcementId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    title: string;
    userRoles: ServiceRoleEnum[];
    params: null | Record<string, unknown>;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcement = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .withDeleted()
      .select([
        'announcement.id',
        'announcement.title',
        'announcement.userRoles',
        'announcement.params',
        'announcement.startsAt',
        'announcement.expiresAt',
        'announcement.deletedAt'
      ])
      .where('announcement.id = :announcementId', { announcementId })
      .getOne();

    if (!announcement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }

    return {
      id: announcement.id,
      title: announcement.title,
      userRoles: announcement.userRoles,
      params: announcement.params,
      startsAt: announcement.startsAt,
      expiresAt: announcement.expiresAt,
      status: this.getAnnouncementStatus(announcement.startsAt, announcement.expiresAt, announcement.deletedAt)
    };
  }

  async createAnnouncement(
    requestContext: DomainContextType,
    data: {
      title: string;
      userRoles: ServiceRoleEnum[];
      params: AnnouncementParamsType;
      startsAt: Date;
      expiresAt?: Date;
      type: AnnouncementTypeEnum;
      filters?: FilterPayload[];
    },
    config?: { usersToExclude?: string[] },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const em = entityManager ?? this.sqlConnection.manager;

    if (data.userRoles.length === 0) {
      throw new BadRequestError(AnnouncementErrorsEnum.ANNOUNCEMENT_NO_TARGET_ROLES);
    }

    return await em.transaction(async transaction => {
      const savedAnnouncement = await transaction.save(AnnouncementEntity, {
        title: data.title,
        userRoles: data.userRoles,
        params: data.params ?? null,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt ?? null,
        type: data.type,
        createdBy: requestContext.id,
        updatedBy: requestContext.id,
        type: data.type ?? AnnouncementTypeEnum.LOG_IN,
        filters: data.filters ?? null
      });

      if (config?.usersToExclude && config.usersToExclude.length > 0) {
        await em.save(
          AnnouncementUserEntity,
          config.usersToExclude.map(userId =>
            AnnouncementUserEntity.new({
              announcement: savedAnnouncement,
              user: UserEntity.new({ id: userId }),
              readAt: new Date(),
              createdBy: requestContext.id,
              updatedBy: requestContext.id
            })
          )
        );
      }

      return { id: savedAnnouncement.id };
    });
  }

  async updateAnnouncement(
    requestContext: DomainContextType,
    announcementId: string,
    data: {
      title?: string;
      userRoles?: ServiceRoleEnum[];
      params?: AnnouncementParamsType;
      startsAt?: Date;
      expiresAt?: Date;
      type?: AnnouncementTypeEnum;
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbAnnouncement = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select([
        'announcement.id',
        'announcement.userRoles',
        'announcement.params',
        'announcement.startsAt',
        'announcement.expiresAt',
        'announcement.deletedAt'
      ])
      .where('announcement.id = :announcementId', { announcementId })
      .getOne();

    if (!dbAnnouncement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }

    const announcementStatus = this.getAnnouncementStatus(
      dbAnnouncement.startsAt,
      dbAnnouncement.expiresAt,
      dbAnnouncement.deletedAt
    );

    const body = this.validateAnnouncementBody(announcementStatus, data, { startsAt: dbAnnouncement.startsAt });

    await em.update(
      AnnouncementEntity,
      { id: announcementId },
      {
        ...body,
        updatedBy: requestContext.id,
        updatedAt: new Date()
      }
    );
  }

  async deleteAnnouncement(announcementId: string, entityManager?: EntityManager): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const announcement = await this.getAnnouncementInfo(announcementId, connection);

    if (announcement.status === AnnouncementStatusEnum.DONE) {
      throw new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_DELETED_IN_DONE_STATUS);
    }

    const announcementUsers = await connection
      .createQueryBuilder(AnnouncementUserEntity, 'announcementUser')
      .select(['announcementUser.id'])
      .where('announcementUser.announcement_id = :announcementId', { announcementId })
      .getMany();

    return await connection.transaction(async transaction => {
      await transaction.softDelete(AnnouncementEntity, { id: announcementId });

      if (announcementUsers.length > 0) {
        await transaction.softDelete(AnnouncementUserEntity, { id: In(announcementUsers.map(u => u.id)) });
      }
    });
  }

  private validateAnnouncementBody(
    status: AnnouncementStatusEnum,
    body: unknown,
    curAnnouncement: { startsAt: Date }
  ): AnnouncementActiveBodyType | AnnouncementScheduledBodyType {
    try {
      if (status === AnnouncementStatusEnum.SCHEDULED) {
        return JoiHelper.Validate<AnnouncementScheduledBodyType>(AnnouncementScheduledBodySchema, body);
      }

      if (status === AnnouncementStatusEnum.ACTIVE) {
        return JoiHelper.Validate<AnnouncementActiveBodyType>(AnnouncementActiveBodySchema, body, {
          startsAt: curAnnouncement.startsAt
        });
      }
    } catch (err: any) {
      throw new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS, {
        details: err.details
      });
    }

    // Means that is in DONE status
    throw new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_UPDATED_IN_DONE_STATUS);
  }

  private getAnnouncementStatus(
    startsAt: Date,
    expiresAt: null | Date,
    deletedAt: null | Date
  ): AnnouncementStatusEnum {
    if (deletedAt) {
      return AnnouncementStatusEnum.DELETED;
    }

    const now = new Date();

    if (now <= startsAt) {
      return AnnouncementStatusEnum.SCHEDULED;
    }

    if (expiresAt && now >= expiresAt) {
      return AnnouncementStatusEnum.DONE;
    }

    return AnnouncementStatusEnum.ACTIVE;
  }
}
