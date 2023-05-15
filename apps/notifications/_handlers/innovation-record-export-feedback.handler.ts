import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { ENV, EmailTypeEnum } from '../_config';
import { BaseHandler } from './base.handler';

export class InnovationRecordExportFeedbackHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
  | EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR
  | EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_ACCESSOR,
  Record<string, never>
> {
  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const request = await this.recipientsService.getExportRequestInfo(this.inputData.requestId);
    const accessor = await this.recipientsService.getUsersRecipient(
      request.createdBy.id,
      [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
      { organisationUnit: request.createdBy.unitId }
    );

    const ownerIdentity = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);

    const templateId =
      request.status === 'APPROVED'
        ? EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_ACCESSOR
        : EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR;

    if (accessor?.isActive) {
      this.emails.push({
        templateId,
        to: accessor,
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          innovator_name: ownerIdentity?.displayName ?? 'user', //Review what should happen if user is not found
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl(),
          pdf_rejection_comment: request.rejectReason
        }
      });
    }

    return this;
  }
}
