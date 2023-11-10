import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class SupportStatusChangeRequestHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST,
  'ST07_SUPPORT_STATUS_CHANGE_REQUEST'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST],
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

      this.notify('ST07_SUPPORT_STATUS_CHANGE_REQUEST', qas, {
        email: {
          notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
          params: {
            accessor_name: accessor,
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id),
            proposed_status: this.inputData.proposedStatus,
            request_comment: this.inputData.requestStatusUpdateComment
          }
        },
        inApp: {
          context: {
            detail: 'ST07_SUPPORT_STATUS_CHANGE_REQUEST',
            type: NotificationCategoryEnum.SUPPORT,
            id: innovation.id
          },
          innovationId: innovation.id,
          params: {
            accessorName: accessor,
            innovationName: innovation.name,
            proposedStatus: this.inputData.proposedStatus
          }
        }
      });
    }
    return this;
  }
}
