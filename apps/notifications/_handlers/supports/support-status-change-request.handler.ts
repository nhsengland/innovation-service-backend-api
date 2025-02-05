import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class SupportStatusChangeRequestHandler extends BaseHandler<
  NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST,
  'ST07_SUPPORT_STATUS_CHANGE_REQUEST'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    // This will always happen because he must be an Accessor
    if (this.requestUser.organisation?.organisationUnit) {
      const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
      const accessor = await this.getUserName(this.requestUser.identityId);
      const qas = await this.recipientsService.organisationUnitsQualifyingAccessors([
        this.requestUser.organisation.organisationUnit.id
      ]);

      const status = TranslationHelper.translate(`SUPPORT_STATUS.${this.inputData.proposedStatus}`).toLowerCase();
      const notificationId = randomUUID();

      this.notify('ST07_SUPPORT_STATUS_CHANGE_REQUEST', qas, {
        email: {
          notificationPreferenceType: 'SUPPORT',
          params: {
            accessor_name: accessor,
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId),
            proposed_status: status,
            request_comment: this.inputData.requestStatusUpdateComment
          }
        },
        inApp: {
          context: {
            detail: 'ST07_SUPPORT_STATUS_CHANGE_REQUEST',
            type: 'SUPPORT',
            id: this.inputData.supportId
          },
          innovationId: innovation.id,
          params: {
            accessorName: accessor,
            innovationName: innovation.name,
            status
          },
          notificationId
        }
      });
    }
    return this;
  }
}
