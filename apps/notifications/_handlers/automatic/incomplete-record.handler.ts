import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationRecordUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class IncompleteRecordHandler extends BaseHandler<
  NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD,
  'AU01_INNOVATOR_INCOMPLETE_RECORD'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.UNIT_KPI],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovations = await this.recipientsService.incompleteInnovations();
    for (const innovation of innovations) {
      const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.innovationId);
      const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);
      this.notify('AU01_INNOVATOR_INCOMPLETE_RECORD', recipients, {
        email: {
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          params: {
            innovation_record_url: innovationRecordUrl(ServiceRoleEnum.INNOVATOR, innovation.innovationId)
          }
        },
        inApp: {
          context: {
            detail: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
            type: NotificationCategoryEnum.AUTOMATIC,
            id: innovation.innovationId
          },
          innovationId: innovation.innovationId,
          params: {}
        }
      });
    }

    return this;
  }
}
