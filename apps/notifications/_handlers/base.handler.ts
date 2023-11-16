import type { Context } from '@azure/functions';
import {
  NotificationCategoryType,
  NotificationDetailType,
  NotificationLogTypeEnum,
  NotificationPreferenceEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import type { DomainContextType, NotificationPreferences, NotifierTemplatesType } from '@notifications/shared/types';
import { EmailTemplates, EmailTemplatesType, container } from '../_config';
import type { InAppTemplatesType } from '../_config/inapp.config';
import { frontendBaseUrl } from '../_helpers/url.helper';
import type { RecipientType, RecipientsService } from '../_services/recipients.service';
import SYMBOLS from '../_services/symbols';

export type EmailRecipientType = { email: string; displayname?: string };
type IdentityRecipientType = Omit<RecipientType, 'userRole'>;

type HandlerEmailType<T> = Array<{
  templateId: T extends keyof EmailTemplates ? T : any; // legacy for now
  notificationPreferenceType: NotificationCategoryType | null;
  to: EmailRecipientType | Omit<IdentityRecipientType, 'userId' | 'role'>; // maybe review this later and it will probably only require roleId
  //params: T extends keyof EmailTemplatesType ? EmailTemplatesType[T] : Record<string, never>;
  params: T extends keyof EmailTemplatesType ? EmailTemplatesType[T] : any; // legacy for now
  log?: {
    type: NotificationLogTypeEnum;
    params: Record<string, string | number>;
  };
  options?: {
    includeLocked?: boolean; // send email even if the user is locked
    ignorePreferences?: boolean; // ignore user email preferences when sending the email
    includeSelf?: boolean; // send email to the user that made the request
  };
}>;

type HandlerEmailOutboundType<T> = {
  templateId: T extends keyof EmailTemplatesType ? T : any; // legacy for now
  to: string;
  // params: T extends keyof EmailTemplatesType ? EmailTemplatesType[T] : Record<string, never>;
  params: T extends keyof EmailTemplatesType ? EmailTemplatesType[T] : any; // legacy for now
  log?: {
    type: NotificationLogTypeEnum;
    params: Record<string, string | number>;
  };
};

type HandlerInAppType<T> = Array<{
  innovationId: string;
  context: {
    type: NotificationCategoryType;
    detail: T extends keyof InAppTemplatesType ? T : any; // legacy for now should be never
    id: string;
  };
  userRoleIds: string[];
  // params: T extends keyof InAppTemplatesType ? InAppTemplatesType[T] : Record<string, never>;
  params: T extends keyof InAppTemplatesType ? InAppTemplatesType[T] : any; // legacy for now
  options?: {
    includeSelf?: boolean; // send email to the user that made the request
  };
}>;

export abstract class BaseHandler<
  InputDataType extends NotifierTypeEnum,
  Notifications extends NotificationDetailType
> {
  requestUser: DomainContextType;
  inputData: NotifierTemplatesType[InputDataType];

  emails: HandlerEmailType<Notifications> = [];
  inApp: HandlerInAppType<Notifications> = [];

  logger: Context['log'];

  protected recipientsService = container.get<RecipientsService>(SYMBOLS.RecipientsService);

  constructor(requestUser: DomainContextType, data: NotifierTemplatesType[InputDataType], azureContext: Context) {
    this.requestUser = requestUser;
    this.inputData = data;
    this.logger = azureContext.log;
  }

  /**
   * Helper method to verify users email notification preferences.
   * Ex: this.isEmailPreferenceInstantly(TASK, userData);
   */
  // TODO: check if we can remove any
  protected isEmailPreferenceInstantly(type: NotificationCategoryType, data?: NotificationPreferences): boolean {
    const preference = data as any; // TS can't infer the correct NotificationPreferences
    return !preference || !preference[type] || preference[type] === NotificationPreferenceEnum.YES;
  }

  /**
   * @deprecated use the helpers from @notifications/shared/helpers
   */
  protected frontendBaseUrl(userRole: ServiceRoleEnum): string {
    return frontendBaseUrl(userRole);
  }

  abstract run(): Promise<this>;

  async getEmails(): Promise<HandlerEmailOutboundType<Notifications>[]> {
    const res: HandlerEmailOutboundType<Notifications>[] = [];
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
          // and don't have preference for this type
          !this.isEmailPreferenceInstantly(
            recipient.notificationPreferenceType,
            emailPreferences.get(recipient.to.roleId)
          )
        ) {
          continue;
        }

        // Ignore if user is the one that made the request
        if (!recipient.options?.includeSelf && recipient.to.identityId === this.requestUser.identityId) {
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

  getInApp(): HandlerInAppType<Notifications> {
    // filter self from inApp notifications (using roleIds in this case instead of user)
    this.inApp.forEach(notification => {
      if (!notification.options?.includeSelf) {
        notification.userRoleIds = notification.userRoleIds.filter(id => id !== this.requestUser.currentRole.id);
      }
    });
    return this.inApp;
  }

  protected addEmails<
    Template extends Notifications extends keyof EmailTemplatesType ? Notifications : never,
    Type extends Omit<HandlerEmailType<Template>[number], 'templateId' | 'to'>
  >(template: Template, recipients: (EmailRecipientType | RecipientType)[], data: Type): void {
    recipients.forEach(recipient => {
      this.emails.push({
        notificationPreferenceType: data.notificationPreferenceType,
        templateId: template,
        to: recipient,
        params: data.params,
        ...(data.options && { options: data.options }),
        ...(data.log && { log: data.log })
      });
    });
  }

  protected addInApp<
    Template extends Notifications extends keyof InAppTemplatesType ? Notifications : never,
    Type extends Omit<HandlerInAppType<Template>[number], 'userRoleIds'>
  >(_template: Template, recipients: string[] | RecipientType[], data: Type): void {
    if (!recipients.length) {
      return;
    }
    const userRoleIds =
      typeof recipients[0] === 'string' ? (recipients as string[]) : (recipients as RecipientType[]).map(r => r.roleId);

    this.inApp.push({
      context: data.context,
      innovationId: data.innovationId,
      params: data.params,
      userRoleIds: userRoleIds,
      ...(data.options && { options: data.options })
    });
  }

  protected notify<
    Template extends Parameters<BaseHandler<InputDataType, Notifications>['addEmails']>[0] &
      Parameters<BaseHandler<InputDataType, Notifications>['addInApp']>[0],
    EmailType extends Omit<HandlerEmailType<Template>[number], 'templateId' | 'to'>,
    InAppType extends Omit<HandlerInAppType<Template>[number], 'userRoleIds'>
  >(template: Template, recipients: RecipientType[], data: { email: EmailType; inApp: InAppType }): void {
    if (!recipients.length) {
      return;
    }
    this.addEmails(template, recipients, data.email);
    this.addInApp(template, recipients, data.inApp);
  }

  private _requestUserName: string | null = null;
  protected async getRequestUserName(): Promise<string> {
    if (!this._requestUserName) {
      this._requestUserName = await this.getUserName(this.requestUser.identityId);
    }
    return this._requestUserName;
  }

  protected getRequestUnitName(): string {
    return this.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
      ? TranslationHelper.translate(`TEAMS.${this.requestUser.currentRole.role}`)
      : this.requestUser.organisation?.organisationUnit?.name ?? '';
  }

  protected async getUserName(identityId?: string | null, role?: ServiceRoleEnum): Promise<string> {
    const name = identityId ? (await this.recipientsService.usersIdentityInfo(identityId))?.displayName ?? null : null;
    if (name) {
      return name;
    }
    role = role ?? this.requestUser.currentRole.role;
    switch (role) {
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return 'accessor user';
      case ServiceRoleEnum.ASSESSMENT:
        return 'assessment user';
      case ServiceRoleEnum.INNOVATOR:
        return 'innovator user';
      default:
        return 'user';
    }
  }
}
