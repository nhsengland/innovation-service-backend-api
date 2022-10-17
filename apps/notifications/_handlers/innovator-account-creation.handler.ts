import type { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import { BaseHandler } from './base.handler';


export class InnovatorAccountCreationHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION,
  EmailTypeEnum.ACCOUNT_CREATION_TO_INNOVATOR,
  Record<string, never>
> {

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    this.emails.push({
      templateId: EmailTypeEnum.ACCOUNT_CREATION_TO_INNOVATOR,
      to: { type: 'identityId', value: this.requestUser.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_service_url: ENV.webBaseUrl
      }
    });

    return this;

  }

}
