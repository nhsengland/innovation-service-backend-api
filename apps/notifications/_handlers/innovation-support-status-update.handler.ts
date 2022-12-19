import { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, InnovationSupportStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { translate } from '../_helpers/translate.helper';
import { BaseHandler } from './base.handler';


export class InnovationSupportStatusUpdateHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
  EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR | EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
  { organisationUnitName: string, supportStatus: InnovationSupportStatusEnum }
> {

  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  private data: {
    innovation?: { name: string, owner: { id: string, identityId: string, type: UserTypeEnum, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] } },
    requestUserAdditionalInfo?: {
      displayName?: string,
      organisation: { id: string, name: string },
      organisationUnit: { id: string, name: string }
    }
  } = {};


  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]
  ) {
    super(requestUser, data);
  }


  async run(): Promise<this> {

    const requestUserInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    this.data.requestUserAdditionalInfo = {
      displayName: requestUserInfo.displayName,
      organisation: { id: requestUserInfo.organisations[0]?.id ?? '', name: requestUserInfo.organisations[0]?.name ?? '' },
      organisationUnit: {
        id: requestUserInfo.organisations[0]?.organisationUnits[0]?.id ?? '', name: requestUserInfo.organisations[0]?.organisationUnits[0]?.name ?? ''
      }
    };

    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    if (this.inputData.innovationSupport.statusChanged) {
      await this.prepareEmailForInnovator();
      await this.prepareInAppForInnovator();

      if ([
        InnovationSupportStatusEnum.NOT_YET,
        InnovationSupportStatusEnum.WAITING,
        InnovationSupportStatusEnum.WITHDRAWN,
        InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED
      ].includes(this.inputData.innovationSupport.status)) {
        await this.prepareInAppForAssessmentWhenWaitingStatus()
      }

    }

    if (this.inputData.innovationSupport.status === InnovationSupportStatusEnum.ENGAGING) {
      await this.prepareInAppForAccessorsWhenEngaging();
      await this.prepareEmailForNewAccessors(this.inputData.innovationSupport.newAssignedAccessors?.filter(a => a.id !== this.requestUser.id));
    }

    return this;

  }


  // Private methods.

  private async prepareEmailForInnovator(): Promise<void> {

    // Send email only to user if email preference INSTANTLY.
    if (this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.SUPPORT, this.data.innovation?.owner.emailNotificationPreferences || [])) {

      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
        to: { type: 'identityId', value: this.data.innovation?.owner.identityId || '', displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: this.data.innovation?.name || '',
          organisation_name: this.data.requestUserAdditionalInfo?.organisation.name || '',
          support_status: translate(this.inputData.innovationSupport.status),
          support_status_change_comment: this.inputData.innovationSupport.message,
          support_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: this.inputData.innovationId })
            .buildUrl()
        }
      });
    
    }

  }

  private async prepareEmailForNewAccessors(accessors?: {id: string}[]): Promise<void> {
    const recipients = await this.recipientsService.usersInfo(accessors?.map(a => a.id) ?? []);
    for (const recipient of recipients) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
        to: { type: 'identityId', value: recipient.identityId, displayNameParam: 'display_name' },
        params: {
          qa_name: this.data.requestUserAdditionalInfo?.displayName ?? 'qualified accessor', // what should the default be, believe it will never happen
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('accessor/innovations/:innovationId')
          .setPathParams({ innovationId: this.inputData.innovationId })
          .buildUrl()
        }
      });
    }
  }

  private async prepareInAppForInnovator(): Promise<void> {

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.SUPPORT, detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE, id: this.inputData.innovationSupport.id },
      userIds: [this.data.innovation?.owner.id || ''],
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });

  }

  private async prepareInAppForAccessorsWhenEngaging(): Promise<void> {

    const assignedUsers = await this.recipientsService.innovationAssignedUsers({ innovationSupportId: this.inputData.innovationSupport.id });

    // TODO: Maybe remove request user if he also assigned to the innovation?

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.SUPPORT, detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE, id: this.inputData.innovationSupport.id },
      userIds: assignedUsers.map(item => item.id),
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });

  }

  private async prepareInAppForAssessmentWhenWaitingStatus(): Promise<void> {

    const assessmentUsers = await this.recipientsService.needsAssessmentUsers();

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.SUPPORT, detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE, id: this.inputData.innovationSupport.id },
      userIds: assessmentUsers.map(item => item.id),
      params: {
        organisationUnitName: this.data.requestUserAdditionalInfo?.organisationUnit.name || '',
        supportStatus: this.inputData.innovationSupport.status
      }
    });

  }

}
