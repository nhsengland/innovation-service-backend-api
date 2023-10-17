import {
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { BadRequestError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';

import type { Context } from '@azure/functions';
import { BaseHandler } from './base.handler';

export class TaskCreationHandler extends BaseHandler<
  NotifierTypeEnum.TASK_CREATION,
  EmailTypeEnum.TASK_CREATION_TO_INNOVATOR,
  { section: string }
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    if (
      ![ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT].includes(
        this.requestUser.currentRole.role as ServiceRoleEnum
      )
    ) {
      throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);
    }

    const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const actionInfo = await this.recipientsService.taskInfoWithOwner(this.inputData.task.id);

    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);

    const recipientsIds = [...collaborators];
    if (innovation.ownerId) {
      recipientsIds.push(innovation.ownerId);
    }

    const innovatorRecipients = await this.recipientsService.getUsersRecipient(
      recipientsIds,
      ServiceRoleEnum.INNOVATOR
    );

    const unitName =
      this.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : actionInfo.organisationUnit?.name ?? '';

    for (const innovator of innovatorRecipients.filter(i => i.isActive)) {
      this.emails.push({
        templateId: EmailTypeEnum.TASK_CREATION_TO_INNOVATOR,
        notificationPreferenceType: NotificationCategoryEnum.TASK,
        to: innovator,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestInfo.displayName,
          unit_name: unitName,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
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
        section: this.inputData.task.section
      }
    });

    return this;
  }
}
