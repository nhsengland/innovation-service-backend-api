import type { Context } from '@azure/functions';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { BaseHandler } from '../base.handler';
import type { RecipientType } from 'apps/notifications/_services/recipients.service';

export class SupportNewAssignedWaitingInnovation extends BaseHandler<
  NotifierTypeEnum.SUPPORT_NEW_ASSIGN_WAITING_INNOVATION,
  'ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SUPPORT_NEW_ASSIGN_WAITING_INNOVATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    const accessorsRecipients = await this.recipientsService.getRecipientsByRoleId([
      ...this.inputData.newAssignedAccessorsIds
    ]);

    if (this.inputData.newAssignedAccessorsIds.length > 0) {
      await this.ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA(innovation, accessorsRecipients);
    }
    return this;
  }

  private async ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const requestUserName = await this.getRequestUserName();

    this.notify('ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA', recipients, {
      email: {
        notificationPreferenceType: 'SUPPORT',
        params: {
          innovation_name: innovation.name,
          qa_name: requestUserName
        }
      },
      inApp: {
        context: {
          type: 'SUPPORT',
          detail: 'ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA',
          id: this.inputData.supportId
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name }
      }
    });
  }
}
