import type { Context } from '@azure/functions';

import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { documentUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class DocumentUploadHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED,
  'DC01_UPLOADED_DOCUMENT_TO_INNOVATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);
    const unitName = this.getRequestUnitName();

    this.addEmails('DC01_UPLOADED_DOCUMENT_TO_INNOVATOR', recipients, {
      notificationPreferenceType: NotificationCategoryEnum.DOCUMENT,
      params: {
        accessor_name: await this.getUserName(this.requestUser.identityId),
        unit_name: unitName,
        document_url: documentUrl(ServiceRoleEnum.INNOVATOR, this.inputData.innovationId, this.inputData.file.id)
      }
    });

    this.addInApp('DC01_UPLOADED_DOCUMENT_TO_INNOVATOR', recipients, {
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationCategoryEnum.DOCUMENT,
        detail: 'DC01_UPLOADED_DOCUMENT_TO_INNOVATOR',
        id: this.inputData.file.id
      },
      params: { fileId: this.inputData.file.id, unitName }
    });

    return this;
  }
}
