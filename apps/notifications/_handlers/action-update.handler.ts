import { EmailNotificationTypeEnum, InnovationActionStatusEnum, InnovationSectionEnum, NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class ActionUpdateHandler extends BaseHandler<
  NotifierTypeEnum.ACTION_UPDATE,
  EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR,
  { actionCode: string, actionStatus: '' | InnovationActionStatusEnum, section: InnovationSectionEnum }
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);

  private data: {
    innovation?: { name: string, owner: { id: string, identityId: string, type: UserTypeEnum } },
    actionInfo?: { id: string, displayId: string, status: InnovationActionStatusEnum, owner: { id: string; identityId: string } }
  } = {};


  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    this.data.actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

    switch (this.requestUser.type) {
      case UserTypeEnum.INNOVATOR:
        await this.prepareInAppForAccessor();
        break;

      case UserTypeEnum.ACCESSOR:
        await this.prepareInAppForInnovator();
        await this.prepareEmailForInnovator();
        break;

      default:
        break;
    }

    return this;

  }


  // Private methods.

  private async prepareInAppForAccessor(): Promise<void> {

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.ACTION, detail: NotificationContextDetailEnum.ACTION_UPDATE, id: this.inputData.action.id },
      userIds: [this.data.actionInfo?.owner.id || ''],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });

  }

  private async prepareInAppForInnovator(): Promise<void> {

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.ACTION, detail: NotificationContextDetailEnum.ACTION_UPDATE, id: this.inputData.action.id },
      userIds: [this.data.innovation?.owner.id || ''],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });

  }

  private async prepareEmailForInnovator(): Promise<void> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    if (this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.ACTION, innovation.owner.emailNotificationPreferences)) {

      const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

      this.emails.push({
        templateId: EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR,
        to: { type: 'identityId', value: this.data.innovation?.owner.identityId || '', displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: requestInfo.displayName ,
          unit_name: '' , // MF - NEED NEW CONTEXT HERE
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({ innovationId: this.inputData.innovationId, actionId: this.inputData.action.id })
              .buildUrl() 
        }
      })
    }
  }

}
