import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import { BaseHandler } from './base.handler';

export class InnovatorAccountCreationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION,
  EmailTypeEnum.ACCOUNT_CREATION_TO_INNOVATOR,
  Record<string, never>
> {
  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const recipient = await this.recipientsService.getUsersRecipient(this.requestUser.id, ServiceRoleEnum.INNOVATOR);
    if (recipient) {
      this.emails.push({
        templateId: EmailTypeEnum.ACCOUNT_CREATION_TO_INNOVATOR,
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
