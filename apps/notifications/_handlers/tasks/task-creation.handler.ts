import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { taskUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class TaskCreationHandler extends BaseHandler<
  NotifierTypeEnum.TASK_CREATION,
  'TA01_TASK_CREATION_TO_INNOVATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const recipients = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );

    const innovatorRecipients = await this.recipientsService.getUsersRecipient(recipients, ServiceRoleEnum.INNOVATOR);
    const unitName = this.getRequestUnitName();

    this.addEmails('TA01_TASK_CREATION_TO_INNOVATOR', innovatorRecipients, {
      notificationPreferenceType: 'TASK',
      params: {
        innovation_name: innovation.name,
        unit_name: unitName,
        task_url: taskUrl(ServiceRoleEnum.INNOVATOR, this.inputData.innovationId, this.inputData.task.id)
      }
    });

    this.addInApp('TA01_TASK_CREATION_TO_INNOVATOR', innovatorRecipients, {
      innovationId: this.inputData.innovationId,
      context: {
        type: 'TASK',
        detail: 'TA01_TASK_CREATION_TO_INNOVATOR',
        id: this.inputData.task.id
      },
      params: {
        innovationName: innovation.name,
        unitName: unitName,
        taskId: this.inputData.task.id
      }
    });

    return this;
  }
}
