import {
  EmailNotificationPreferenceEnum,
  EmailNotificationType,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotificationLogTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { EmailTemplatesType, EmailTypeEnum, container } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import type { RecipientType } from '../_services/recipients.service';

type EmailRecipientType = { email: string; displayname?: string };
type IdentityRecipientType = Omit<RecipientType, 'userRole'>;

type HandlerEmailType<T> = Array<{
  templateId: EmailTypeEnum;
  notificationPreferenceType: EmailNotificationType | null;
  to: EmailRecipientType | Omit<IdentityRecipientType, 'userId' | 'role'>; // maybe review this later and it will probably only require roleId
  params: T;
  log?: {
    type: NotificationLogTypeEnum;
    params: Record<string, string | number>;
  };
  options?: {
    includeLocked?: boolean; // send email even if the user is locked
    ignorePreferences?: boolean; // ignore user email preferences when sending the email
  };
}>;

type HandlerEmailOutboundType<T> = {
  templateId: EmailTypeEnum;
  to: string;
  params: T;
  log?: {
    type: NotificationLogTypeEnum;
    params: Record<string, string | number>;
  };
};

// TODO review this
type HandlerInAppType<T> = Array<{
  innovationId: string;
  context: { type: NotificationContextTypeEnum; detail: NotificationContextDetailEnum; id: string };
  userRoleIds: string[];
  params: T;
}>;

export abstract class BaseHandler<
  InputDataType extends NotifierTypeEnum,
  EmailResponseType extends EmailTypeEnum,
  InAppResponseType
> {
  requestUser: { id: string; identityId: string };
  inputData: NotifierTemplatesType[InputDataType];
  domainContext: DomainContextType;

  emails: HandlerEmailType<EmailTemplatesType[EmailResponseType]> = [];
  inApp: HandlerInAppType<InAppResponseType> = [];

  protected recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[InputDataType],
    domainContext: DomainContextType
  ) {
    this.requestUser = requestUser;
    this.inputData = data;
    this.domainContext = domainContext;
  }

  /**
   * Helper method to verify users email notification preferences.
   * Ex: this.isEmailPreferenceInstantly(EmailNotificationType.ACTION, userData);
   */
  protected isEmailPreferenceInstantly(
    type: EmailNotificationType,
    data: { type: EmailNotificationType; preference: EmailNotificationPreferenceEnum }[]
  ): boolean {
    return (
      (data.find(item => item.type === type)?.preference || EmailNotificationPreferenceEnum.INSTANTLY) ===
      EmailNotificationPreferenceEnum.INSTANTLY
    );
  }

  protected frontendBaseUrl(userRole: ServiceRoleEnum): string {
    switch (userRole) {
      case ServiceRoleEnum.ASSESSMENT:
        return 'assessment';
      case ServiceRoleEnum.ACCESSOR:
        return 'accessor';
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return 'accessor';
      case ServiceRoleEnum.INNOVATOR:
        return 'innovator';
      default:
        return '';
    }
  }

  abstract run(): Promise<this>;

  async getEmails(): Promise<HandlerEmailOutboundType<EmailTemplatesType[EmailResponseType]>[]> {
    const res: HandlerEmailOutboundType<EmailTemplatesType[EmailResponseType]>[] = [];
    // TODO: create sets of recipients

    for (const recipient of this.emails) {
      if ('email' in recipient.to) {
        res.push({
          templateId: recipient.templateId,
          to: recipient.to.email,
          params: { ...recipient.params, ...(recipient.to.displayname && { display_name: recipient.to.displayname }) },
          log: recipient.log
        });
      } else {
        // skip if user is not active unless includeLocked is true
        if (!recipient.options?.includeLocked && recipient.to.isActive === false) {
          continue;
        }
        // TODO fetch preferences according to type / filter
        const user = await this.recipientsService.usersIdentityInfo(recipient.to.identityId);
        if (user) {
          res.push({
            templateId: recipient.templateId,
            to: user.email,
            params: { ...recipient.params, display_name: user.displayName },
            log: recipient.log
          });
        }
      }
    }
    return res;
  }

  getInApp(): HandlerInAppType<InAppResponseType> {
    return this.inApp;
  }
}
