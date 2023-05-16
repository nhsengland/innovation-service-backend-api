import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserEntity } from '@admin/shared/entities';
import { AnnouncementParamsType, AnnouncementStatusEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { AnnouncementErrorsEnum, BadRequestError, NotFoundError } from '@admin/shared/errors';
import { JoiHelper, PaginationQueryParamsType } from '@admin/shared/helpers';
import type { DomainContextType } from '@admin/shared/types';

import Joi from 'joi';
import { BaseService } from './base.service';

/** TODO: This is for update */
export type AnnouncementScheduledBodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType['GENERIC'];
  startsAt: Date;
  expiresAt?: Date;
};
export const AnnouncementScheduledBodySchema = Joi.object<AnnouncementScheduledBodyType>({
  title: Joi.string().max(100).required().description('Title of the announcement'),
  userRoles: Joi.array()
    .items(
      Joi.string()
        .valid(...Object.values(ServiceRoleEnum).filter(t => t !== ServiceRoleEnum.ADMIN))
        .required()
        .description('User roles that will see the announcement.')
    )
    .min(1),
  params: Joi.object<AnnouncementScheduledBodyType['params']>({
    inset: Joi.object<AnnouncementScheduledBodyType['params']['inset']>({
      title: Joi.string().required(),
      content: Joi.string().optional(),
      link: Joi.object({
        label: Joi.string(),
        url: Joi.string()
      }).optional()
    }).optional(),
    content: Joi.string().optional(),
    actionLink: Joi.object<AnnouncementScheduledBodyType['params']['actionLink']>({
      label: Joi.string(),
      url: Joi.string()
    }).optional()
  }),
  startsAt: Joi.date().required(),
  expiresAt: Joi.date().optional()
}).required();

export type AnnouncementActiveBodyType = {
  expiresAt: Date;
};
export const AnnouncementActiveBodySchema = Joi.object<AnnouncementActiveBodyType>({
  expiresAt: Joi.date().required()
}).required();

@injectable()
export class AnnouncementsService extends BaseService {
  constructor() {
    super();
  }

  async getAnnouncementsList(pagination: PaginationQueryParamsType<never>): Promise<{
    count: number;
    data: {
      id: string;
      title: string;
      userRoles: ServiceRoleEnum[];
      params: null | Record<string, unknown>;
      startsAt: Date;
      expiresAt: null | Date;
      status: AnnouncementStatusEnum;
    }[];
  }> {
    const [dbAnnouncements, dbCount] = await this.sqlConnection.manager
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select([
        'announcement.id',
        'announcement.title',
        'announcement.userRoles',
        'announcement.params',
        'announcement.startsAt',
        'announcement.expiresAt'
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
        status: this.getAnnouncementStatus(announcement.startsAt, announcement.expiresAt)
      }))
    };
  }

  async getAnnouncementInfo(announcementId: string): Promise<{
    id: string;
    title: string;
    userRoles: ServiceRoleEnum[];
    params: null | Record<string, unknown>;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
  }> {
    const announcement = await this.sqlConnection.manager
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select([
        'announcement.id',
        'announcement.title',
        'announcement.userRoles',
        'announcement.params',
        'announcement.startsAt',
        'announcement.expiresAt'
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
      status: this.getAnnouncementStatus(announcement.startsAt, announcement.expiresAt)
    };
  }

  async createAnnouncement(
    requestContext: DomainContextType,
    data: {
      title: string;
      userRoles: ServiceRoleEnum[];
      // template: T;
      params: AnnouncementParamsType['GENERIC']; // For now, only the generic template is possible to create.
      startsAt: Date;
      expiresAt?: Date;
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
        template: 'GENERIC',
        userRoles: data.userRoles,
        params: data.params ?? null,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt ?? null,
        createdBy: requestContext.id,
        updatedBy: requestContext.id
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

  /** TODO: WIP */
  async updateAnnouncement(
    requestContext: DomainContextType,
    announcementId: string,
    data: {
      title: string;
      userRoles: ServiceRoleEnum[];
      // template: T;
      params: AnnouncementParamsType['GENERIC']; // For now, only the generic template is possible to create.
      startsAt: Date;
      expiresAt?: Date;
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbAnnouncement = await this.sqlConnection.manager
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select([
        'announcement.id',
        'announcement.userRoles',
        'announcement.params',
        'announcement.startsAt',
        'announcement.expiresAt'
      ])
      .where('announcement.id = :announcementId', { announcementId })
      .getOne();

    if (!dbAnnouncement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }

    const announcementStatus = this.getAnnouncementStatus(dbAnnouncement.startsAt, dbAnnouncement.expiresAt);

    this.validateAnnouncementBody(announcementStatus, data);

    await em.update(
      AnnouncementEntity,
      { id: announcementId },
      {
        // userRoles: data.userRoles,
        params: data.params ?? null,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt ?? null,
        updatedBy: requestContext.id,
        updatedAt: new Date()
      }
    );
  }

  /** TODO: WIP */
  private validateAnnouncementBody(status: AnnouncementStatusEnum, body: any) {
    if (status === AnnouncementStatusEnum.SCHEDULED) {
      return JoiHelper.Validate<AnnouncementScheduledBodyType>(AnnouncementScheduledBodySchema, body);
    }

    if (status === AnnouncementStatusEnum.ACTIVE) {
      return JoiHelper.Validate<AnnouncementActiveBodyType>(AnnouncementActiveBodySchema, body);
    }

    return null;
  }

  private getAnnouncementStatus(startsAt: Date, expiresAt: null | Date): AnnouncementStatusEnum {
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
