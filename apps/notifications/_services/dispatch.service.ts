import { inject, injectable } from 'inversify';

import type { NotificationContextTypeEnum, NotificationContextDetailEnum } from '@notifications/shared/enums';
import { InnovationEntity, NotificationEntity, NotificationUserEntity, UserEntity } from '@notifications/shared/entities';
import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@notifications/shared/services';

import type { EmailTemplatesType, EmailTypeEnum } from '../_config';

import { BaseService } from './base.service';
import { EmailServiceSymbol, EmailServiceType } from './interfaces';


@injectable()
export class DispatchService extends BaseService {

  constructor(
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(EmailServiceSymbol) private emailService: EmailServiceType,
  ) {
    super();
  }


  async sendEmail<T extends EmailTypeEnum>(
    type: EmailTypeEnum,
    to: { type: 'email' | 'identityId', value: string, displayNameParam?: string },
    params: EmailTemplatesType[T]
  ): Promise<boolean> {

    let email: string = to.type === 'email' ? to.value : '';

    // If an identityId was provided, fetch e-mail.
    if (!email && to.type === 'identityId') {

      const authUser = await this.identityProviderService.getUserInfo(to.value);

      email = authUser.email;

      if (to.displayNameParam) { // If displayNameParam is provided, insert/override it.
        params = { ...params, [to.displayNameParam]: authUser.displayName };
      }

    }

    // TODO: Does it make sense to verify if user is active here?

    return this.emailService.sendEmail(type, email, params);

  }

  async saveInAppNotification(
    requestUser: { id: string },
    innovationId: string,
    context: { type: NotificationContextTypeEnum, detail: NotificationContextDetailEnum, id: string },
    userIds: string[],
    params: { [key: string]: string | number | string[] }
  ): Promise<{ id: string }> {

    return this.sqlConnection.transaction(async transactionManager => {

      const dbNotification = await transactionManager.save(NotificationEntity, NotificationEntity.new({
        contextType: context.type,
        contextDetail: context.detail,
        contextId: context.id,
        innovation: InnovationEntity.new({ id: innovationId }),
        params: JSON.stringify(params),
        createdBy: requestUser.id
      }));

      await transactionManager.save(NotificationUserEntity, userIds.map(userId => NotificationUserEntity.new({
        user: UserEntity.new({ id: userId }),
        notification: dbNotification,
        createdBy: requestUser.id
      })));

      return { id: dbNotification.id };

    });

  }

}
