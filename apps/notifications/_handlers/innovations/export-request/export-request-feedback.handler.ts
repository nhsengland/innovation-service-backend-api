import type { Context } from '@azure/functions';
import { InnovationExportRequestStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationRecordUrl } from '../../../_helpers/url.helper';
import type { RecipientType } from '../../../_services/recipients.service';
import { BaseHandler } from '../../base.handler';
import { randomUUID } from 'crypto';

export class ExportRequestFeedbackHandler extends BaseHandler<
  NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK,
  'RE02_EXPORT_REQUEST_APPROVED' | 'RE03_EXPORT_REQUEST_REJECTED'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const request = await this.recipientsService.getExportRequestInfo(this.inputData.exportRequestId);
    const recipient = await this.recipientsService.getUsersRecipient(
      request.createdBy.id,
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT],
      { organisationUnit: request.createdBy.unitId }
    );
    if (!recipient) {
      return this;
    }

    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    switch (request.status) {
      case InnovationExportRequestStatusEnum.APPROVED:
        await this.RE02_EXPORT_REQUEST_APPROVED(innovation, recipient);
        break;
      case InnovationExportRequestStatusEnum.REJECTED:
        await this.RE03_EXPORT_REQUEST_REJECTED(innovation, recipient, request.rejectReason!); // If status is rejected is required to have the rejectReason
        break;
    }

    return this;
  }

  private async RE02_EXPORT_REQUEST_APPROVED(
    innovation: { id: string; name: string },
    recipient: RecipientType
  ): Promise<void> {
    const requestName = await this.getRequestUserName();
    const notificationId = randomUUID();

    this.notify('RE02_EXPORT_REQUEST_APPROVED', [recipient], {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          innovator_name: requestName,
          innovation_record_url: innovationRecordUrl(recipient.role, innovation.id, notificationId)
        }
      },
      inApp: {
        context: {
          id: this.inputData.exportRequestId,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'RE02_EXPORT_REQUEST_APPROVED'
        },
        innovationId: innovation.id,
        params: {
          exportRequestId: this.inputData.exportRequestId,
          innovationName: innovation.name
        },
        notificationId
      }
    });
  }

  private async RE03_EXPORT_REQUEST_REJECTED(
    innovation: { id: string; name: string },
    recipient: RecipientType,
    rejectReason: string
  ): Promise<void> {
    const requestName = await this.getRequestUserName();
    const notificationId = randomUUID();

    this.notify('RE03_EXPORT_REQUEST_REJECTED', [recipient], {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          innovator_name: requestName,
          reject_comment: rejectReason
        }
      },
      inApp: {
        context: {
          id: this.inputData.exportRequestId,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'RE03_EXPORT_REQUEST_REJECTED'
        },
        innovationId: innovation.id,
        params: {
          exportRequestId: this.inputData.exportRequestId,
          innovationName: innovation.name
        },
        notificationId
      }
    });
  }
}
