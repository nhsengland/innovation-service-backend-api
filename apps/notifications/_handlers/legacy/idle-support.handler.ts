import { NotificationLogTypeEnum, NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { UrlModel } from '@notifications/shared/models';
import { BaseHandler } from '../base.handler';

export class IdleSupportHandler extends BaseHandler<NotifierTypeEnum.IDLE_SUPPORT, 'MIGRATION_OLD'> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.notifyIdleAccessors();

    return this;
  }

  private async notifyIdleAccessors(): Promise<void> {
    const idleSupports = await this.recipientsService.idleSupports();

    if (!idleSupports.length) {
      return;
    }

    const ownerIds = [...new Set(idleSupports.map(i => i.ownerIdentityId))];
    const ownerIdentities = await this.recipientsService.usersIdentityInfo(ownerIds);

    for (const idleSupport of idleSupports) {
      const owner = ownerIdentities.get(idleSupport.ownerIdentityId);
      if (!owner) {
        this.logger.error(`Innovation owner not found for innovation: ${idleSupport.innovationId}`, {});
        continue;
      }

      this.emails.push({
        templateId: 'QA_A_IDLE_SUPPORT',
        to: idleSupport.recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: idleSupport.innovationName,
          innovator_name: owner.displayName,
          message_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/threads')
            .setPathParams({
              innovationId: idleSupport.innovationId
            })
            .buildUrl()
        },
        log: {
          type: NotificationLogTypeEnum.QA_A_IDLE_SUPPORT,
          params: {
            innovationId: idleSupport.innovationId,
            unitId: idleSupport.unitId
          }
        }
      });
    }
  }
}
