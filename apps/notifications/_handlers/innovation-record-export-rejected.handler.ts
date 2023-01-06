import type { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { NotifierTemplatesType } from '@notifications/shared/types';
import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';

/**
 * @deprecated see InnovationRecordExportFeedbackHandler, this doesn't seem to be used any longer - to be removed (2023-01-06)
 */
export class InnovationRecordExportRejectedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
  EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST]
  ) {
    super(requestUser, data);
  }

  async run(): Promise<this> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const request = await this.recipientsService.getExportRequestWithRelations(this.inputData.requestId);

    const innovatorName = await this.recipientsService.userInfo(innovation.owner.id);

    this.emails.push({
      templateId: EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR,
      to: { type: 'identityId', value: request.createdBy.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovation.name,
        innovator_name: innovatorName.name,
        innovation_url:  new UrlModel(ENV.webBaseTransactionalUrl)
        .addPath('accessor/innovations/:innovationId')
        .setPathParams({ innovationId: this.inputData.innovationId })
        .buildUrl(),
        pdf_rejection_comment: request.exportRequest.rejectReason || 'reject reason not provided', // should never occur given that the request entity conditionally requires this property
      }
    });
    

    return this;
  }
}