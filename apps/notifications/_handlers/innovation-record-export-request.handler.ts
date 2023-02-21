import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';

export class InnovationRecordExportRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
  EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST],
    domainContext: DomainContextType,
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const request = await this.recipientsService.getExportRequestWithRelations(this.inputData.requestId);

    if (innovation.owner.isActive) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
        to: { type: 'identityId', value: innovation.owner.identityId, displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          unit_name: request.exportRequest.organisationUnit.name,
          accessor_name: request.createdBy.name,
          pdf_request_comment: request.exportRequest.requestReason,
          pdf_export_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/export/list')
          .setPathParams({ innovationId: this.inputData.innovationId })
          .buildUrl(), // TODO: Check what exactly is this URL.
        }
      });
    }

    return this;
  }
}