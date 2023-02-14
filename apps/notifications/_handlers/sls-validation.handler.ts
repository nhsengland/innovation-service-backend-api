import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@notifications/shared/services';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum } from '../_config';

import { BaseHandler } from './base.handler';


export class SLSValidationHandler extends BaseHandler<
  NotifierTypeEnum.SLS_VALIDATION,
  EmailTypeEnum.SLS_VALIDATION,
  Record<string, never>
> {

  private identityProviderService = container.get<IdentityProviderServiceType>(IdentityProviderServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.SLS_VALIDATION],
    domainContext: DomainContextType,
  ) {
    super(requestUser, data, domainContext);
  }


  async run(): Promise<this> {

    const requestUserInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

    this.emails.push({
      templateId: EmailTypeEnum.SLS_VALIDATION,
      to: { type: 'email', value: requestUserInfo.email },
      params: {
        display_name: requestUserInfo.displayName,
        code: this.inputData.code
      }
    });

    return this;

  }

}
