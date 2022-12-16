import { InnovationActionEntity, InnovationSupportEntity, NotificationEntity, OrganisationEntity, OrganisationUnitEntity, OrganisationUnitUserEntity, UserEntity } from '@admin/shared/entities';
import { AccessorOrganisationRoleEnum, InnovationActionStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, NotifierTypeEnum, OrganisationTypeEnum } from '@admin/shared/enums';
import { NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@admin/shared/errors';
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from '@admin/shared/services';
import type { DomainUserInfoType } from '@admin/shared/types';
import { NotificationUserEntity } from '@admin/shared/entities';
import { inject, injectable } from 'inversify';
import { EntityManager, In } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class OrganisationsService extends BaseService {
  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) {
    super();
  }

  async inactivateUnit(
    requestUser: DomainUserInfoType,
    unitId: string
  ): Promise<{
    unitId: string;
  }> {
   
      // lock users of unit
      if (usersToLock.length > 0) {
        await transaction.update(
          UserEntity,
          { id: In(usersToLock.map((u) => u.id)) },
          { lockedAt: new Date().toISOString() }
        );
      }

  }

}
