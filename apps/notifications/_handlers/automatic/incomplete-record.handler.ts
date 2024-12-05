import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationRecordUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

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
      const notificationId = randomUUID();

      this.notify('AU01_INNOVATOR_INCOMPLETE_RECORD', recipients, {
        email: {
          notificationPreferenceType: 'AUTOMATIC',
          params: {
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              innovation.innovationId,
              notificationId
            )
          }
        },
        inApp: {
          context: {
            detail: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
            type: 'AUTOMATIC',
            id: innovation.innovationId
          },
          innovationId: innovation.innovationId,
          params: {},
          notificationId
        }
      });
    }

    return this;
  }
}
