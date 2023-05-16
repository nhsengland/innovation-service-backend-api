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
    data?: Partial<Record<EmailNotificationType, EmailNotificationPreferenceEnum>>
  ): boolean {
    return !data || !data[type] || data[type] === EmailNotificationPreferenceEnum.INSTANTLY;
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

    // Optimize preference and email fetching by fetching only once
    const uniqueRoles = new Set<string>();
    const uniqueIdentities = new Set<string>();
    this.emails.forEach(recipient => {
      if ('roleId' in recipient.to) {
        if (!uniqueRoles.has(recipient.to.roleId)) {
          uniqueRoles.add(recipient.to.roleId);
        }
        if (!uniqueIdentities.has(recipient.to.identityId)) {
          uniqueIdentities.add(recipient.to.identityId);
        }
      }
    });

    const identities = await this.recipientsService.usersIdentityInfo([...uniqueIdentities]);
    const emailPreferences = await this.recipientsService.getEmailPreferences([...uniqueRoles]);

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

        // skip if notification has preference, user preference is not instant and ignore preference is not set
        if (
          recipient.notificationPreferenceType && // if preference is set
          !recipient.options?.ignorePreferences && // and ignore is not set
          // and preference is not instant
          !this.isEmailPreferenceInstantly(
            recipient.notificationPreferenceType,
            emailPreferences.get(recipient.to.roleId)
          )
        ) {
          continue;
        }

        const user = identities.get(recipient.to.identityId);
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
