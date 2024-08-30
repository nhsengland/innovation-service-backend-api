import { inject, injectable } from 'inversify';
import { EntityManager, IsNull } from 'typeorm';

import { AnnouncementEntity, AnnouncementUserEntity, UserEntity } from '@admin/shared/entities';
import {
  AnnouncementParamsType,
  AnnouncementStatusEnum,
  AnnouncementTypeEnum,
  InnovationCollaboratorStatusEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@admin/shared/enums';
import {
  AnnouncementErrorsEnum,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableEntityError
} from '@admin/shared/errors';
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
      .select([
        'announcement.id',
        'announcement.status',
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
        status: announcement.status,
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
    params: AnnouncementParamsType;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
    filters: null | FilterPayload[];
    sendEmail: boolean;
    type: AnnouncementTypeEnum;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcement = await this.getAnnouncementPartialInfo(
      announcementId,
      [
        'id',
        'status',
        'title',
        'userRoles',
        'params',
        'startsAt',
        'expiresAt',
        'deletedAt',
        'filters',
        'sendEmail',
        'type'
      ],
      em
    );

    return {
      id: announcement.id,
      title: announcement.title,
      userRoles: announcement.userRoles,
      params: announcement.params,
      startsAt: announcement.startsAt,
      expiresAt: announcement.expiresAt,
      status: announcement.status,
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
        sendEmail: data.sendEmail ?? false,
        status: this.getAnnouncementStatus(data.startsAt, data.expiresAt)
      });

      if (savedAnnouncement.status === AnnouncementStatusEnum.ACTIVE) {
        await this.activateAnnouncement(
          requestContext.id,
          savedAnnouncement,
          { usersToExclude: config?.usersToExclude },
          transaction
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
      filters?: FilterPayload[];
      sendEmail?: boolean;
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbAnnouncement = await this.getAnnouncementPartialInfo(
      announcementId,
      ['id', 'status', 'userRoles', 'params', 'startsAt', 'expiresAt', 'deletedAt', 'type', 'sendEmail'],
      em
    );

    const announcementStatus = this.getAnnouncementStatus(dbAnnouncement.startsAt, dbAnnouncement.expiresAt);

    const body = this.validateAnnouncementBody(announcementStatus, data, { startsAt: dbAnnouncement.startsAt });

    await em.transaction(async transaction => {
      await em.update(
        AnnouncementEntity,
        { id: announcementId },
        {
          ...body,
          updatedBy: requestContext.id,
          updatedAt: new Date()
        }
      );

      if (
        announcementStatus === AnnouncementStatusEnum.ACTIVE &&
        dbAnnouncement.status === AnnouncementStatusEnum.SCHEDULED
      ) {
        await this.activateAnnouncement(requestContext.id, announcementId, {}, transaction);
      }
    });
  }

  async deleteAnnouncement(
    domainContext: DomainContextType,
    announcementId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    return await connection.transaction(async transaction => {
      await this.updateAnnouncementStatus(
        domainContext.id,
        announcementId,
        AnnouncementStatusEnum.DELETED,
        transaction
      );
      await transaction.delete(AnnouncementUserEntity, { announcementId, readAt: IsNull() });
    });
  }

  private async addAnnouncementUsers(
    announcement: Pick<AnnouncementEntity, 'id' | 'status' | 'sendEmail' | 'userRoles' | 'filters' | 'createdBy'>,
    options: { usersToExclude?: string[] },
    transaction: EntityManager
  ): Promise<void> {
    // userId::innovationId
    const targetedInnovators = new Set<string>(); // Saves the userIds from the Innovators and their associated innovations
    const targetRolesUserIds = new Set<string>(); // Saves the userIds that are not bound to a innovation
    const targetRoles = new Set(announcement.userRoles);

    // If its type innovation filtered get all the collaborators + owners for all the targetted innovations.
    if (announcement.filters && targetRoles.has(ServiceRoleEnum.INNOVATOR)) {
      targetRoles.delete(ServiceRoleEnum.INNOVATOR);

      const innovations = await this.domainService.innovations.getInnovationsFiltered(
        announcement.filters,
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
          announcement: AnnouncementEntity.new({ id: announcement.id }),
          user: UserEntity.new({ id: u.id }),
          ...(u.innovationId && { innovation: InnovationEntity.new({ id: u.innovationId }) }),
          createdBy: announcement.createdBy,
          updatedBy: announcement.createdBy,
          ...(options.usersToExclude && options.usersToExclude.includes(u.id) && { readAt: new Date() })
        })
      ),
      { chunk: 500 }
    );
  }

  async activateAnnouncement(
    activatedBy: string,
    announcement: string | AnnouncementEntity,
    options: { usersToExclude?: string[] },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcementInfo = await this.getAnnouncementPartialInfo(
      announcement,
      ['id', 'status', 'userRoles', 'filters', 'createdBy', 'sendEmail'],
      em
    );

    await em.transaction(async transaction => {
      await this.addAnnouncementUsers(announcementInfo, options, transaction);
      // On the create we previously change the status, this check is to prevent double updates.
      if (announcementInfo.status === AnnouncementStatusEnum.SCHEDULED) {
        await this.updateAnnouncementStatus(activatedBy, announcementInfo.id, AnnouncementStatusEnum.ACTIVE);
      }
    });

    // TODO: Send notification.
    if (announcementInfo.sendEmail) {
    }
  }

  async getAnnouncementsToActivate(entityManager?: EntityManager): Promise<AnnouncementEntity[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcements = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .where('GETDATE() > announcement.starts_at')
      .andWhere('(announcement.expires_at IS NULL OR GETDATE() < announcement.expires_at)')
      .andWhere('announcement.status = :scheduledStatus', { scheduledStatus: AnnouncementStatusEnum.SCHEDULED })
      .getMany();

    return announcements;
  }

  private async updateAnnouncementStatus(
    updatedBy: string,
    announcementId: string,
    status: AnnouncementStatusEnum,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcement = await this.getAnnouncementPartialInfo(announcementId, ['id', 'status'], em);

    if (
      (status === AnnouncementStatusEnum.ACTIVE && announcement.status !== AnnouncementStatusEnum.SCHEDULED) ||
      (status === AnnouncementStatusEnum.DONE && announcement.status !== AnnouncementStatusEnum.ACTIVE) ||
      (status === AnnouncementStatusEnum.DELETED && announcement.status !== AnnouncementStatusEnum.DONE)
    ) {
      throw new ConflictError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_UPDATE_STATUS);
    }

    await em.update(AnnouncementEntity, { id: announcementId }, { status, updatedBy, updatedAt: new Date() });
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

    if (status === AnnouncementStatusEnum.DELETED) {
      throw new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_UPDATED_IN_DELETED_STATUS);
    }

    // Means that is in DONE status
    throw new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_UPDATED_IN_DONE_STATUS);
  }

  private getAnnouncementStatus(startsAt: Date, expiresAt?: null | Date): AnnouncementStatusEnum {
    const now = new Date();

    if (now <= startsAt) {
      return AnnouncementStatusEnum.SCHEDULED;
    }

    if (expiresAt && now >= expiresAt) {
      return AnnouncementStatusEnum.DONE;
    }

    return AnnouncementStatusEnum.ACTIVE;
  }

  /**
   * Function that either makes sure that all the needed fields exist on the entity or refetches it.
   */
  private async getAnnouncementPartialInfo<T extends Exclude<keyof AnnouncementEntity, 'announcementUsers'>>(
    announcement: string | AnnouncementEntity,
    fields: T[],
    entityManager?: EntityManager
  ): Promise<Pick<AnnouncementEntity, T>> {
    const em = entityManager ?? this.sqlConnection.manager;

    // If the announcement already has all the fields needed to need to refetch it.
    if (
      typeof announcement !== 'string' &&
      fields.filter(f => !['filters', 'expiresAt'].includes(f)).every(f => !(f in announcement))
    ) {
      return announcement;
    }

    const dbAnnouncement = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select(fields.map(f => `announcement.${f}`))
      .where('announcement.id = :announcementId', { announcementId: announcement })
      .getOne();
    if (!dbAnnouncement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }
    return dbAnnouncement;
  }
}
