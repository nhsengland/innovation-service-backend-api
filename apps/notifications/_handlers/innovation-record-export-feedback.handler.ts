import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';

export class InnovationRecordExportFeedbackHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
  | EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR
  | EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_ACCESSOR,
  Record<string, never>
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const request = await this.recipientsService.getExportRequestWithRelations(this.inputData.requestId);

    const innovatorName = await this.recipientsService.userInfo(innovation.owner.id);

    const templateId =
      request.exportRequest.status === 'APPROVED'
        ? EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_ACCESSOR
        : EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR;

    if (request.createdBy.isActive) {
      this.emails.push({
        templateId,
        to: {
          type: 'identityId',
          value: request.createdBy.identityId,
          displayNameParam: 'display_name'
        },
        params: {
          innovation_name: innovation.name,
          innovator_name: innovatorName.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl(),
          pdf_rejection_comment: request.exportRequest.rejectReason
        }
      });
    }

    return this;
  }
}
