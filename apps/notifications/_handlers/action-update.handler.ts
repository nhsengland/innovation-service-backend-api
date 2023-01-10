import { EmailNotificationTypeEnum, InnovationActionStatusEnum, InnovationSectionEnum, NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { EmailErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class ActionUpdateHandler extends BaseHandler<
  NotifierTypeEnum.ACTION_UPDATE,
  EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR | EmailTypeEnum.ACTION_DECLINED_TO_INNOVATOR | EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR,
  { actionCode: string, actionStatus: '' | InnovationActionStatusEnum, section: InnovationSectionEnum }
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);

  private data: {
    innovation?: { name: string, owner: { id: string, identityId: string, type: UserTypeEnum } },
    actionInfo?: { id: string, displayId: string, status: InnovationActionStatusEnum, owner: { id: string; identityId: string } },
    comment?: string
  } = {};


  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE],
    domainContext?: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }


  async run(): Promise<this> {

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    this.data.actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id);

    switch (this.requestUser.type) {
      case UserTypeEnum.INNOVATOR:
        await this.prepareInAppForAccessor();
        await this.prepareEmailForAccessor();
        if (this.data.actionInfo.status === InnovationActionStatusEnum.DECLINED) {
          await this.prepareInAppForInnovator();
          await this.prepareEmailForInnovator();
        }
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
      domainContext: this.domainContext,
      context: { type: NotificationContextTypeEnum.ACTION, detail: NotificationContextDetailEnum.ACTION_UPDATE, id: this.inputData.action.id },
      userIds: [this.data.actionInfo?.owner.id || ''],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section
      }
    });

  }

  private async prepareEmailForAccessor(): Promise<void> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId)

    let templateId: EmailTypeEnum
    switch (this.data.actionInfo?.status) {
      case InnovationActionStatusEnum.DECLINED:
        templateId = EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR
        break
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND)
    }

    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });
    const actionInfo = await this.recipientsService.actionInfoWithOwner(this.inputData.action.id)

    this.emails.push({
      templateId: templateId,
      to: { type: 'identityId', value: actionInfo.owner.id, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovator_name: requestInfo.displayName,
        innovation_name: innovation.name,
        declined_action_reason: this.inputData.comment ?? '',
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({ innovationId: this.inputData.innovationId, actionId: this.inputData.action.id })
          .buildUrl()
      }
    })
  }

  private async prepareInAppForInnovator(): Promise<void> {

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      domainContext: this.domainContext,
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

      let templateId: EmailTypeEnum
      switch (this.data.actionInfo?.status) {
        case InnovationActionStatusEnum.CANCELLED:
          templateId = EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR
          break
        case InnovationActionStatusEnum.DECLINED:
          templateId = EmailTypeEnum.ACTION_DECLINED_TO_INNOVATOR
          break
        default:
          throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND)
      }

      const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

      let accessor_name = requestInfo.displayName
      let unit_name = this.domainContext?.organisation?.organisationUnit?.name ?? ''

      if (requestInfo.type === UserTypeEnum.INNOVATOR) {
        accessor_name = (await this.domainService.users.getUserInfo({ userId: this.data.actionInfo.owner.id })).displayName
        unit_name = (await this.recipientsService.actionInfoWithOwner(this.data.actionInfo.id)).organisationUnit.name
      }

      this.emails.push({
        templateId: templateId,
        to: { type: 'identityId', value: this.data.innovation?.owner.identityId || '', displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: accessor_name,
          unit_name: unit_name,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({ innovationId: this.inputData.innovationId, actionId: this.inputData.action.id })
            .buildUrl()
        }
      })
    }
  }

}