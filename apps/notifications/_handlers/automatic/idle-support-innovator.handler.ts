import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl, innovationRecordUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class IdleSupportInnovatorHandler extends BaseHandler<
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
    const notificationDates = [30, 90, 150];
    const idleInnovations = await this.recipientsService.innovationsWithoutSupportForNDays(notificationDates);

    for (const innovation of idleInnovations) {
      const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.id);
      const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);
      const notificationId = randomUUID();

      this.notify('AU03_INNOVATOR_IDLE_SUPPORT', recipients, {
        email: {
          notificationPreferenceType: 'AUTOMATIC',
          params: {
            innovation_name: innovation.name,
            innovation_record_url: innovationRecordUrl(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId),
            expected_archive_date: innovation.expectedArchiveDate,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId)
          }
        },
        inApp: {
          context: {
            detail: 'AU03_INNOVATOR_IDLE_SUPPORT',
            type: 'AUTOMATIC',
            id: innovation.id
          },
          innovationId: innovation.id,
          params: {
            innovationName: innovation.name,
            expectedArchiveDate: innovation.expectedArchiveDate
          },
          notificationId
        }
      });
    }

    return this;
  }
}
