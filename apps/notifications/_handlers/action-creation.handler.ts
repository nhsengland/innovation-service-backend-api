import {
  EmailNotificationTypeEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import { BadRequestError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, ENV } from '../_config';
import { EmailTypeEnum } from '../_config/emails.config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';

export class ActionCreationHandler extends BaseHandler<
  NotifierTypeEnum.ACTION_CREATION,
  EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
  { section: string }
> {
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_CREATION],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    if (
      ![
        ServiceRoleEnum.ACCESSOR,
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        ServiceRoleEnum.ASSESSMENT,
      ].includes(this.domainContext.currentRole.role as ServiceRoleEnum)
    ) {
      throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);
    }

    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    const actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

    const collaborators = await this.recipientsService.innovationActiveCollaboratorUsers(
      this.inputData.innovationId
    );

    const innovatorRecipients = [...collaborators, innovation.owner];

    for (const innovator of innovatorRecipients.filter((i) => i.isActive)) {
      if (
        this.isEmailPreferenceInstantly(
          EmailNotificationTypeEnum.ACTION,
          innovator.emailNotificationPreferences
        )
      ) {
        this.emails.push({
          templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
          to: {
            type: 'identityId',
            value: innovator.identityId || '',
            displayNameParam: 'display_name',
          },
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            accessor_name: requestInfo.displayName,
            unit_name: actionInfo.organisationUnit?.name ?? '',
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                innovationId: this.inputData.innovationId,
                actionId: this.inputData.action.id,
              })
              .buildUrl(),
          },
        });
      }
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_CREATION,
        id: this.inputData.action.id,
      },
      userRoleIds: innovatorRecipients.map((i) => i.userRole.id),
      params: {
        section: this.inputData.action.section,
      },
    });

    return this;
  }
}
