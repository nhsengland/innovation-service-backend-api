import {
  EmailNotificationPreferenceEnum, EmailNotificationTypeEnum,
  NotificationContextDetailEnum, NotificationContextTypeEnum, NotificationLogTypeEnum, NotifierTypeEnum,
  UserTypeEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { EmailTemplatesType, EmailTypeEnum } from '../_config';


type HandlerEmailResponseType<T> = Array<{
  templateId: EmailTypeEnum;
  to: { type: 'email' | 'identityId', value: string, displayNameParam?: string };
  params: T;
  log?: {
    type: NotificationLogTypeEnum,
    params: Record<string, string | number>,
  }
}>;

type HandlerInAppResponseType<T> = Array<{
  innovationId: string;
  context: { type: NotificationContextTypeEnum, detail: NotificationContextDetailEnum, id: string },
  userIds: string[];
  params: T;
}>;


export abstract class BaseHandler<
  InputDataType extends NotifierTypeEnum,
  EmailResponseType extends EmailTypeEnum,
  InAppResponseType
> {

  requestUser: { id: string, identityId: string, type: UserTypeEnum };
  inputData: NotifierTemplatesType[InputDataType];
  domainContext: DomainContextType | undefined;

  emails: HandlerEmailResponseType<EmailTemplatesType[EmailResponseType]> = [];
  inApp: HandlerInAppResponseType<InAppResponseType> = [];

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: NotifierTemplatesType[InputDataType],
    domainContext?: DomainContextType
  ) {

    this.requestUser = requestUser;
    this.inputData = data;
    this.domainContext = domainContext;

  }


  /**
   * Helper method to verify users email notification preferences.
   * Ex: this.isEmailPreferenceInstantly(EmailNotificationTypeEnum.ACTION, userData);
   */
  protected isEmailPreferenceInstantly(type: EmailNotificationTypeEnum, data: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]): boolean {
    return (data.find(item => item.type === type)?.preference || EmailNotificationPreferenceEnum.INSTANTLY) === EmailNotificationPreferenceEnum.INSTANTLY;
  }

  protected frontendBaseUrl(userType: UserTypeEnum): string {
    switch (userType) {
      case UserTypeEnum.ASSESSMENT: return 'assessment';
      case UserTypeEnum.ACCESSOR: return 'accessor';
      case UserTypeEnum.INNOVATOR: return 'innovator';
      default: return '';
    }
  }


  abstract run(): Promise<this>;


  getEmails(): HandlerEmailResponseType<EmailTemplatesType[EmailResponseType]> {
    return this.emails;
  }

  getInApp(): HandlerInAppResponseType<InAppResponseType> {
    return this.inApp;
  }

}
