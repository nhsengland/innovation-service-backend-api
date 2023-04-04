import { UserEntity } from '@admin/shared/entities';
import { AnnouncementUserEntity } from '@admin/shared/entities/user/announcement-user.entity';
import { AnnouncementEntity } from '@admin/shared/entities/user/announcement.entity';
import type { AnnouncementParamsType, AnnouncementTemplateType, ServiceRoleEnum } from '@admin/shared/enums';
import { AnnouncementErrorsEnum, BadRequestError, UnprocessableEntityError } from '@admin/shared/errors';
import type { DateISOType } from '@admin/shared/types';
import { injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { BaseService } from '../../admin/_services/base.service';

@injectable()
export class AnnouncementsService extends BaseService {

  constructor() {
    super();
  }

  async createAnnouncement<T extends AnnouncementTemplateType>(
    targetRoles: ServiceRoleEnum[],
    config: {
      template: T,
      params?: AnnouncementParamsType[T],
      startsAt?: DateISOType,
      expiresAt?: DateISOType
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    if (targetRoles.length === 0) {
      throw new BadRequestError(AnnouncementErrorsEnum.ANNOUNCEMENT_NO_TARGET_ROLES);
    }

    return await connection.transaction(async transaction => {
      const targetUserIds = await transaction.createQueryBuilder(UserEntity, 'user')
        .select(['user.id'])
        .innerJoin('user.serviceRoles', 'userRoles')
        .where('userRoles.role IN (:...targetRoles)', { targetRoles })
        .groupBy('user.id')
        .getMany();

      if (targetUserIds.length === 0) {
        throw new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_NO_TARGET_USERS);
      }

      const announcement = await transaction.save(AnnouncementEntity, {
        template: config.template,
        targetRoles,
        params: config?.params ?? null,
        startsAt: config?.startsAt,
        expiresAt: config?.expiresAt ?? null
      });

      await transaction.save(AnnouncementUserEntity, targetUserIds.map(user => AnnouncementUserEntity.new({
        announcement: announcement,
        user: UserEntity.new({ id: user.id }),
        targetRoles: targetRoles
      })), { chunk: 500 });

    });

  }

}
