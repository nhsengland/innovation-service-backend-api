import { EmailNotificationTypeEnum, NotifierTypeEnum, NotificationContextTypeEnum, NotificationContextDetailEnum, UserTypeEnum } from '@notifications/shared/enums';
import { BadRequestError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

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
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_CREATION]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    if (this.requestUser.type !== UserTypeEnum.ACCESSOR) {
      throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);
    }

    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    if (this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.ACTION, innovation.owner.emailNotificationPreferences)) {

      // TODO: GET PROPER UNIT NAME OF THE ACCESSOR. THIS IS DONE BY RELATING THE INNOVATION_SUPPORT_ID WITH THE CREATED ACTION.
      this.emails.push({
        templateId: EmailTypeEnum.ACTION_CREATION_TO_INNOVATOR,
        to: { type: 'identityId', value: innovation?.owner.identityId || '', displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestInfo.displayName,
          unit_name: requestInfo.organisations[0]?.organisationUnits[0]?.name || '',
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({ innovationId: this.inputData.innovationId, actionId: this.inputData.action.id })
            .buildUrl()
        }
      });

    }


    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.ACTION, detail: NotificationContextDetailEnum.ACTION_CREATION, id: this.inputData.action.id },
      userIds: [innovation?.owner.id || ''],
      params: {
        section: this.inputData.action.section
      }
    });

    return this;

  }


}
