import {
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';

import type { Context } from '@azure/functions';
import { BaseHandler } from './base.handler';

export class TaskCreationHandler extends BaseHandler<
  NotifierTypeEnum.TASK_CREATION,
  EmailTypeEnum.TA01_TASK_CREATION_TO_INNOVATOR,
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
    const taskInfo = await this.recipientsService.taskInfoWithOwner(this.inputData.task.id);
    const recipients = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );

    const innovatorRecipients = await this.recipientsService.getUsersRecipient(recipients, ServiceRoleEnum.INNOVATOR);

    const unitName =
      this.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : taskInfo.organisationUnit?.name ?? '';

    for (const innovator of innovatorRecipients.filter(i => i.isActive)) {
      this.emails.push({
        templateId: EmailTypeEnum.TA01_TASK_CREATION_TO_INNOVATOR,
        notificationPreferenceType: NotificationCategoryEnum.TASK,
        to: innovator,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          unit_name: unitName,
          task_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/tasks/:taskId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              taskId: this.inputData.task.id
            })
            .buildUrl()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.TASK,
        detail: NotificationContextDetailEnum.TASK_CREATION,
        id: this.inputData.task.id
      },
      userRoleIds: innovatorRecipients.map(i => i.roleId),
      params: {
        innovationName: innovation.name,
        organisationUnitName: unitName,
        taskId: this.inputData.task.id
      }
    });

    return this;
  }
}
