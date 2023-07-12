import {
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { BadRequestError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { DomainService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';

import type { Context } from '@azure/functions';
import { BaseHandler } from './base.handler';

export class ActionCreationHandler extends BaseHandler<
  NotifierTypeEnum.ACTION_CREATION,
  EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
  { section: string }
> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_CREATION],
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

    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

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
        templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
        notificationPreferenceType: 'ACTION',
        to: innovator,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestInfo.displayName,
          unit_name: unitName,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              actionId: this.inputData.action.id
            })
            .buildUrl()
        }
      });
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_CREATION,
        id: this.inputData.action.id
      },
      userRoleIds: innovatorRecipients.map(i => i.roleId),
      params: {
        section: this.inputData.action.section
      }
    });

    return this;
  }
}
