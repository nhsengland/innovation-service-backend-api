import { NotificationLogTypeEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UserErrorsEnum } from '@notifications/shared/errors';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class IdleSupportHandler extends BaseHandler<
  NotifierTypeEnum.IDLE_SUPPORT,
  EmailTypeEnum.QA_A_IDLE_SUPPORT,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string; type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    await this.notifyIdleAccessors();

    return this;

  }

  private async notifyIdleAccessors(): Promise<void> {

    const idleSupportsByInnovation = await this.recipientsService.idleSupportsByInnovation();

    if(!idleSupportsByInnovation.length) return;

    const ownerIds = [...new Set(idleSupportsByInnovation.flatMap(is => is.values.map(i => i.ownerId)))];
    const ownerIdentities = await this.recipientsService.usersIdentityInfo(ownerIds);

    for (const innovation of idleSupportsByInnovation) {
      const ownerId = innovation.values.find(_ => true)?.ownerId;

      if (!ownerId) {
        throw new Error(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }

      for (const details of innovation.values) {
        this.emails.push({
          templateId: EmailTypeEnum.QA_A_IDLE_SUPPORT,
          to: { type: 'identityId', value: details.identityId, displayNameParam: 'display_name'},
          params: {
            innovation_name: innovation.values.find(_ => true)?.innovationName || '',
            innovator_name: ownerIdentities.find(i => i.identityId === details.ownerIdentityId)?.displayName || '',
          },
          log: {
            type: NotificationLogTypeEnum.QA_A_IDLE_SUPPORT,
            params: {
              innovationId: details.innovationId,
              unitId: details.unitId,
            }
          }
        })
      }
    }
  }

}
