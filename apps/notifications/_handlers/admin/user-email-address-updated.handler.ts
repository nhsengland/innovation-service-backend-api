import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import type { RecipientType } from 'apps/notifications/_services/recipients.service';
import { BaseHandler } from '../base.handler';

export class UserEmailAddressUpdatedHandler extends BaseHandler<
  NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED,
  'AP08_USER_EMAIL_ADDRESS_UPDATED'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const userId = await this.recipientsService.identityId2UserId(this.inputData.identityId);

    if (!userId) {
      return this;
    }

    const recipient = await this.recipientsService.getUsersRecipient(userId, [
      ServiceRoleEnum.ADMIN,
      ServiceRoleEnum.QUALIFYING_ACCESSOR,
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.ASSESSMENT,
      ServiceRoleEnum.INNOVATOR
    ]);

    if (recipient) {
      await this.AP08_USER_EMAIL_ADDRESS_UPDATED(recipient);
    }

    return this;
  }

  private async AP08_USER_EMAIL_ADDRESS_UPDATED(recipient: RecipientType): Promise<void> {
    const displayName = await this.getUserName(recipient.identityId);

    this.addEmails(
      'AP08_USER_EMAIL_ADDRESS_UPDATED',
      [recipient, { email: this.inputData.oldEmail, displayname: displayName }],
      {
        notificationPreferenceType: 'ADMIN',
        params: {
          new_email_address: this.inputData.newEmail
        },
        options: { includeLocked: true }
      }
    );
  }
}
