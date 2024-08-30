import { inject, injectable } from 'inversify';
import { EntityManager, In } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserEntity } from '@admin/shared/entities';
import {
  AnnouncementParamsType,
  AnnouncementStatusEnum,
  AnnouncementTypeEnum,
  InnovationCollaboratorStatusEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@admin/shared/enums';
import { AnnouncementErrorsEnum, BadRequestError, NotFoundError, UnprocessableEntityError } from '@admin/shared/errors';
import { JoiHelper, PaginationQueryParamsType } from '@admin/shared/helpers';
import type { DomainContextType } from '@admin/shared/types';

import {
  AnnouncementActiveBodySchema,
  AnnouncementActiveBodyType,
  AnnouncementBodySchema,
  AnnouncementBodyType
} from './announcements.schemas';
import { BaseService } from './base.service';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';
import { AdminErrorsEnum } from '@admin/shared/errors/errors.enums';
import { InnovationEntity } from '@admin/shared/entities';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { DomainService } from '@admin/shared/services';

@injectable()
export class AnnouncementsService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService) {
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
        type: announcement.type
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
    params: null | AnnouncementParamsType;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
    filters: null | FilterPayload[];
    sendEmail: boolean;
    type: AnnouncementTypeEnum;
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
        'announcement.deletedAt',
        'announcement.filters',
        'announcement.sendEmail',
        'announcement.type'
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
      status: this.getAnnouncementStatus(announcement.startsAt, announcement.expiresAt, announcement.deletedAt),
      filters: announcement.filters,
      sendEmail: announcement.sendEmail,
      type: announcement.type
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
      sendEmail?: boolean;
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
        filters: data.filters ?? null,
        sendEmail: data.sendEmail ?? false
      });

      const today = new Date();
      if (data.startsAt.toDateString() === today.toDateString()) {
        await this.addAnnouncementUsers(savedAnnouncement, { usersToExclude: config?.usersToExclude }, transaction);
        // TODO: Add notification call.
        if (data.sendEmail) {
        }
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
      filters?: FilterPayload[];
      sendEmail?: boolean;
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
        'announcement.deletedAt',
        'announcement.type',
        'announcement.sendEmail'
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

  async addAnnouncementUsers(
    announcement: string | AnnouncementEntity,
    options: { usersToExclude?: string[] },
    transaction: EntityManager
  ): Promise<void> {
    // Get announcement info
    let announcementInfo: AnnouncementEntity;
    if (typeof announcement === 'string') {
      const dbAnnouncement = await transaction
        .createQueryBuilder(AnnouncementEntity, 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement })
        .getOne();
      if (!dbAnnouncement) {
        throw new NotFoundError(AdminErrorsEnum.ADMIN_ANNOUNCEMENT_NOT_FOUND);
      }
      announcementInfo = dbAnnouncement;
    } else {
      announcementInfo = announcement;
    }

    // userId::innovationId
    const targetedInnovators = new Set<string>(); // Saves the userIds from the Innovators and their associated innovations
    const targetRolesUserIds = new Set<string>(); // Saves the userIds that are not bound to a innovation
    const targetRoles = new Set(announcementInfo.userRoles);

    // If its type innovation filtered get all the collaborators + owners for all the targetted innovations.
    if (announcementInfo.filters && targetRoles.has(ServiceRoleEnum.INNOVATOR)) {
      targetRoles.delete(ServiceRoleEnum.INNOVATOR);

      const innovations = await this.domainService.innovations.getInnovationsFiltered(
        announcementInfo.filters,
        { onlySubmitted: true },
        transaction
      );

      if (innovations.length) {
        const ownerAndCollaboratorInfo = await transaction
          .createQueryBuilder(InnovationEntity, 'innovation')
          .select(['innovation.id', 'owner.id', 'collaborator.id', 'collaboratorUser.id'])
          .leftJoin('innovation.owner', 'owner', 'owner.status <> :deleted ', { deleted: UserStatusEnum.DELETED })
          .leftJoin('innovation.collaborators', 'collaborator', 'collaborator.status = :active', {
            active: InnovationCollaboratorStatusEnum.ACTIVE
          })
          .leftJoin('collaborator.user', 'collaboratorUser', 'collaboratorUser.status <> :deleted', {
            deleted: UserStatusEnum.DELETED
          })
          .where('innovation.id IN (:...innovationIds)', { innovationIds: innovations.map(i => i.id) })
          .getMany();
        ownerAndCollaboratorInfo.forEach(i => {
          if (i.owner) {
            targetedInnovators.add(`${i.owner.id}::${i.id}`);
          }
          i.collaborators.forEach(c => c.user && targetedInnovators.add(`${c.user.id}::${i.id}`));
        });
      }
    }

    // This filter is needed since if its of type INNOVATOR + filtered we already got the Innovators in the query before.
    if (targetRoles.size) {
      const users = await transaction
        .createQueryBuilder(UserEntity, 'user')
        .select(['user.id'])
        .innerJoin('user.serviceRoles', 'role')
        .where('role.role IN (:...targetRoles)', { targetRoles: Array.from(targetRoles) })
        .andWhere('role.isActive = 1')
        .getMany();
      users.forEach(u => targetRolesUserIds.add(u.id));
    }

    // Add users to the announcementUsers table.
    const targetedUsers: { id: string; innovationId?: string }[] = [];
    targetRolesUserIds.forEach(id => targetedUsers.push({ id }));
    targetRolesUserIds.clear();
    targetedInnovators.forEach(value => {
      const [userId, innovationId] = value.split('::');
      if (userId && innovationId) {
        targetedUsers.push({ id: userId, innovationId });
      }
    });
    targetedInnovators.clear();

    await transaction.save(
      AnnouncementUserEntity,
      targetedUsers.map(u =>
        AnnouncementUserEntity.new({
          announcement: announcementInfo,
          user: UserEntity.new({ id: u.id }),
          ...(u.innovationId && { innovation: InnovationEntity.new({ id: u.innovationId }) }),
          createdBy: announcementInfo.createdBy,
          updatedBy: announcementInfo.createdBy,
          ...(options.usersToExclude && options.usersToExclude.includes(u.id) && { readAt: new Date() })
        })
      ),
      { chunk: 500 }
    );
  }

  private validateAnnouncementBody(
    status: AnnouncementStatusEnum,
    body: unknown,
    curAnnouncement: { startsAt: Date }
  ): AnnouncementActiveBodyType | AnnouncementBodyType {
    try {
      if (status === AnnouncementStatusEnum.SCHEDULED) {
        return JoiHelper.Validate<AnnouncementBodyType>(AnnouncementBodySchema, body);
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
