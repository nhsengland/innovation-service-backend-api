import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { HandlersHelper } from '../../../_helpers/handlers.helper';
import { exportRequestUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class ExportRequestSubmittedHandler extends BaseHandler<
  NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED,
  'RE01_EXPORT_REQUEST_SUBMITTED'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const recipient = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    if (!recipient) {
      return this;
    }

    const senderName = await this.getRequestUserName();
    const displayTag = HandlersHelper.getNotificationDisplayTag(this.requestUser.currentRole.role, {
      unitName: this.requestUser.organisation?.organisationUnit?.name
    });

    this.notify('RE01_EXPORT_REQUEST_SUBMITTED', [recipient], {
      email: {
        notificationPreferenceType: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
        params: {
          comment: this.inputData.comment,
          innovation_name: innovation.name,
          request_url: exportRequestUrl(ServiceRoleEnum.INNOVATOR, innovation.id, this.inputData.exportRequestId),
          sender: `${senderName} (${displayTag})`
        }
      },
      inApp: {
        context: {
          id: this.inputData.exportRequestId,
          type: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
          detail: 'RE01_EXPORT_REQUEST_SUBMITTED'
        },
        innovationId: innovation.id,
        params: {
          exportRequestId: this.inputData.exportRequestId,
          innovationName: innovation.name,
          unitName: displayTag
        }
      }
    });

    return this;
  }
}
