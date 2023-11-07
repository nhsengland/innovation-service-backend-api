import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { howToProceedUrl, innovationRecordUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class IdleSupportHandler extends BaseHandler<
  NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR,
  'AU03_INNOVATOR_IDLE_SUPPORT'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const idleInnovations = await this.recipientsService.innovationsWithoutSupportForNDays([30, 210]); // 1 month ; 7 months

    for (const innovation of idleInnovations) {
      const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.id);
      const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);
      this.notify('AU03_INNOVATOR_IDLE_SUPPORT', recipients, {
        email: {
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          params: {
            innovation_name: innovation.name,
            innovation_record_url: innovationRecordUrl(ServiceRoleEnum.INNOVATOR, innovation.id),
            how_to_proceed_page_url: howToProceedUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
          }
        },
        inApp: {
          context: {
            detail: 'AU03_INNOVATOR_IDLE_SUPPORT',
            type: NotificationCategoryEnum.AUTOMATIC,
            id: innovation.id
          },
          innovationId: innovation.id,
          params: {
            innovationName: innovation.name
          }
        }
      });
    }

    return this;
  }
}
