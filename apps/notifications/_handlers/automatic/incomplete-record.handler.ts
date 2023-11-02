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
    const idleInnovators = await this.recipientsService.incompleteInnovationRecordOwners();

    for (const innovator of idleInnovators) {
      this.notify('AU01_INNOVATOR_INCOMPLETE_RECORD', [innovator.recipient], {
        email: {
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          params: {
            innovation_record_url: innovationRecordUrl(ServiceRoleEnum.INNOVATOR, innovator.innovationId)
          }
        },
        inApp: {
          context: {
            detail: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
            type: NotificationCategoryEnum.AUTOMATIC,
            id: innovator.innovationId
          },
          innovationId: innovator.innovationId,
          params: {}
        }
      });
    }

    return this;
  }
}
