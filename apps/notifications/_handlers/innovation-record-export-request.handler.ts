import type { Context } from '@azure/functions';
import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { ENV, EmailTypeEnum } from '../_config';
import { BaseHandler } from './base.handler';

export class InnovationRecordExportRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
  EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
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
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (owner?.isActive) {
      const request = await this.recipientsService.getExportRequestInfo(this.inputData.requestId);
      const accessor = await this.recipientsService.getUsersRecipient(
        request.createdBy.id,
        [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        { organisationUnit: request.createdBy.unitId }
      );
      const accessorIdentity = accessor ? await this.recipientsService.usersIdentityInfo(accessor.identityId) : null;

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
        to: owner,
        notificationPreferenceType: null,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          unit_name: request.createdBy.unitName ?? TranslationHelper.translate('TEAMS.ASSESSMENT'),
          accessor_name: accessorIdentity?.displayName ?? 'user', //Review what should happen if user is not found
          pdf_request_comment: request.requestReason,
          pdf_export_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/export/list')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl() // TODO: Check what exactly is this URL.
        }
      });
    }

    return this;
  }
}
