import type { Context } from '@azure/functions';
import { InnovationExportRequestStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { dashboardUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class AccountCreationHandler extends BaseHandler<
  NotifierTypeEnum.ACCOUNT_CREATION,
  'CA01_ACCOUNT_CREATION_OF_INNOVATOR' | 'CA02_ACCOUNT_CREATION_OF_COLLABORATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    // This is currently only accounting with innovator accounts creation.
    const recipient = await this.recipientsService.getUsersRecipient(this.requestUser.id, ServiceRoleEnum.INNOVATOR);
    const identityInfo = await this.recipientsService.usersIdentityInfo(this.requestUser.identityId);
    if (!recipient || !identityInfo) {
      return this;
    }
    const collaborations = await this.recipientsService.getUserCollaborations(identityInfo.email, [
      InnovationExportRequestStatusEnum.PENDING
    ]);

    if (collaborations.length === 0) {
      await this.CA01_ACCOUNT_CREATION_OF_INNOVATOR(recipient);
    } else {
      await this.CA02_ACCOUNT_CREATION_OF_COLLABORATOR(
        recipient,
        collaborations.map(c => c.innovationName)
      );
    }

    return this;
  }

  private async CA01_ACCOUNT_CREATION_OF_INNOVATOR(recipient: RecipientType): Promise<void> {
    const notificationId = randomUUID();

    this.addEmails('CA01_ACCOUNT_CREATION_OF_INNOVATOR', [recipient], {
      notificationPreferenceType: 'ACCOUNT',
      params: {
        dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR, notificationId)
      },
      options: { includeSelf: true }
    });
  }

  private async CA02_ACCOUNT_CREATION_OF_COLLABORATOR(
    recipient: RecipientType,
    innovationNames: string[]
  ): Promise<void> {
    const notificationId = randomUUID();

    this.addEmails('CA02_ACCOUNT_CREATION_OF_COLLABORATOR', [recipient], {
      notificationPreferenceType: 'ACCOUNT',
      params: {
        innovations_name: HandlersHelper.transformIntoBullet(innovationNames),
        multiple_innovations: innovationNames.length > 1 ? 'yes' : 'no',
        dashboard_url: dashboardUrl(ServiceRoleEnum.INNOVATOR, notificationId)
      },
      options: { includeSelf: true }
    });
  }
}
