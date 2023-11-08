import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { BaseHandler } from '../../base.handler';

export class InnovationWithdrawnHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_WITHDRAWN,
  'WI01_INNOVATION_WITHDRAWN'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.WI01_INNOVATION_WITHDRAWN();
    return this;
  }

  private async WI01_INNOVATION_WITHDRAWN(): Promise<void> {
    const assignedUsers = await this.recipientsService.usersBagToRecipients(
      this.inputData.innovation.affectedUsers.map(u => ({
        id: u.userId,
        userType: u.userType,
        organisationUnit: u.unitId
      }))
    );

    this.addInApp('WI01_INNOVATION_WITHDRAWN', assignedUsers, {
      context: {
        id: this.inputData.innovation.id,
        type: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
        detail: 'WI01_INNOVATION_WITHDRAWN'
      },
      innovationId: this.inputData.innovation.id,
      params: { innovationName: this.inputData.innovation.name }
    });

    const uniqueAssignedUsers = [...new Map(assignedUsers.map(item => [item['userId'], item])).values()];
    this.addEmails('WI01_INNOVATION_WITHDRAWN', uniqueAssignedUsers, {
      notificationPreferenceType: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
      params: { innovation_name: this.inputData.innovation.name }
    });
  }
}
