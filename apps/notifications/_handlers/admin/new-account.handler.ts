import type { Context } from '@azure/functions';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { BaseHandler } from '../base.handler';

export class NewAccountHandler extends BaseHandler<NotifierTypeEnum.NEW_ACCOUNT, 'AP09_NEW_ACCOUNT'> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEW_ACCOUNT],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.AP09_NEW_ACCOUNT(this.inputData.recipientEmail);

    return this;
  }

  private async AP09_NEW_ACCOUNT(newUserEmail: string): Promise<void> {
    this.addEmails('AP09_NEW_ACCOUNT', [{ email: newUserEmail }], {
      notificationPreferenceType: 'ADMIN',
      params: {}
    });
  }
}
