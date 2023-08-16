import type { Context } from '@azure/functions';
import { InnovationExportRequestStatusEnum, NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { ENV, EmailTypeEnum } from '../_config';
import { BaseHandler } from './base.handler';

export class InnovationRecordExportFeedbackHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
  | EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_REQUEST_CREATOR
  | EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_REQUEST_CREATOR,
  Record<string, never>
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const request = await this.recipientsService.getExportRequestInfo(this.inputData.requestId);
    const requestCreator = await this.recipientsService.getUsersRecipient(
      request.createdBy.id,
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT],
      { organisationUnit: request.createdBy.unitId }
    );

    const ownerIdentity = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);

    const templateId =
      request.status === InnovationExportRequestStatusEnum.APPROVED
        ? EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_REQUEST_CREATOR
        : EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_REQUEST_CREATOR;

    if (requestCreator?.isActive) {
      this.emails.push({
        templateId,
        to: requestCreator,
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          innovator_name: ownerIdentity?.displayName ?? 'user', // Review what should happen if user is not found
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId/record')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(requestCreator.role),
              innovationId: this.inputData.innovationId
            })
            .buildUrl(),
          pdf_rejection_comment: request.rejectReason
        }
      });
    }

    return this;
  }
}
