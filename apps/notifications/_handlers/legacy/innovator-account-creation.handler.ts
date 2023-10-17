import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { BaseHandler } from '../base.handler';

export class InnovatorAccountCreationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION,
  'MIGRATION_OLD'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const recipient = await this.recipientsService.getUsersRecipient(this.requestUser.id, ServiceRoleEnum.INNOVATOR);
    if (recipient) {
      this.emails.push({
        templateId: 'ACCOUNT_CREATION_TO_INNOVATOR',
        to: recipient,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_service_url: ENV.webBaseUrl
        }
      });
    }
    return this;
  }
}
