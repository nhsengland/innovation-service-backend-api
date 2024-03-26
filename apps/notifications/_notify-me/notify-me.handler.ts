import { ServiceRoleEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import type {
  DomainContextType,
  EventPayloads,
  EventType,
  IdentityUserInfo,
  NotifyMeSubscriptionType
} from '@notifications/shared/types';
import { inject } from 'inversify';
import { isArray } from 'lodash';
import type { MessageType as EmailMessageType } from '../v1-emails-listener/validation.schemas';
import type { MessageType as InAppMessageType } from '../v1-in-app-listener/validation.schemas';
import type { EmailTemplatesType } from '../_config';
import type { InAppTemplatesType } from '../_config/inapp.config';
import type { NotifyMeService } from '../_services/notify-me.service';
import type { RecipientsService } from '../_services/recipients.service';
import SYMBOLS from '../_services/symbols';

export type EventPayload = {
  requestUser: DomainContextType;
  innovationId: string;
} & {
  [K in EventType]: {
    type: K;
    params: EventPayloads[K];
  };
}[EventType];

// NOTE: This can be transformed into an abstract class and the functions getInAppParams and getEmailParams be specific implementations
// This would help remove some of the cluter from the "BaseHandler"
export class NotifyMeHandler {
  private event: EventPayload;

  #inApps: InAppMessageType[] = [];
  get inApps() {
    return this.#inApps;
  }
  #emails: EmailMessageType[] = [];
  get emails() {
    return this.#emails;
  }

  constructor(
    @inject(SYMBOLS.NotifyMeService) private notifyMeService: NotifyMeService,
    @inject(SYMBOLS.RecipientsService) private recipientsService: RecipientsService,
    event: EventPayload
  ) {
    this.event = event;
  }

  public async execute(): Promise<void> {
    const eventSubscribers = await this.getTriggerSubscribers();

    const subscribers = [];
    for (const subscriber of eventSubscribers) {
      if (this.validatePreconditions(subscriber)) {
        subscribers.push(subscriber);
      }
    }
    if (!subscribers.length) return;

    const innovation = await this.recipientsService.innovationInfo(this.event.innovationId);
    const recipients = new Map(
      (await this.recipientsService.getRecipientsByRoleId(subscribers.map(t => t.roleId))).map(r => [r.roleId, r])
    );
    const identities = await this.recipientsService.usersIdentityInfo([...recipients.values()].map(r => r.identityId));

    for (const subscriber of subscribers) {
      const recipient = recipients.get(subscriber.roleId)!;
      const identity = identities.get(recipient.identityId);
      if (!identity) continue;

      const params = {
        inApp: this.getInAppParams(subscriber, innovation),
        email: this.getEmailParams(identity, subscriber, innovation)
      };

      const inAppPayload = this.buildInApp(subscriber, params.inApp);
      const emailPayload = this.buildEmail(identity.email, subscriber, params.email);

      switch (subscriber.config.subscriptionType) {
        case 'INSTANTLY':
          this.#emails.push(emailPayload);
          this.#inApps.push(inAppPayload);
          break;

        // NOTE: Currently they are doing the same thing, if this changes just change it to specific.
        case 'PERIODIC':
        case 'SCHEDULED':
          await this.notifyMeService.createScheduledNotification(subscriber, {
            inApp: inAppPayload,
            email: emailPayload
          });
          break;
      }
    }
  }

  protected async getTriggerSubscribers(): Promise<NotifyMeSubscriptionType[]> {
    return await this.notifyMeService.getEventSubscribers(this.event);
  }

  protected validatePreconditions(subscription: NotifyMeSubscriptionType): boolean {
    if (this.event.type !== subscription.config.eventType) return false;

    for (const [field, match] of Object.entries(subscription.config.preConditions)) {
      const matcher = isArray(match) ? match : [match];

      if (field in this.event.params && !matcher.includes((this.event.params as any)[field])) {
        return false;
      }
    }

    return true;
  }

  // NOTE: This could be abstract and implemented by each of the trigger types
  protected getInAppParams(
    subscription: NotifyMeSubscriptionType,
    innovation: { id: string; name: string }
  ): InAppTemplatesType[keyof InAppTemplatesType] {
    switch (this.event.type) {
      case 'SUPPORT_UPDATED':
        return {
          innovation: innovation.name,
          event: this.event.type,
          organisation: this.getRequestUnitName(),
          supportStatus: this.event.params.status
        };

      case 'PROGRESS_UPDATE_CREATED':
        return {
          innovation: innovation.name,
          event: this.event.type,
          description: this.event.params.description,
          unit: this.getRequestUnitName()
        };

      case 'REMINDER':
        let message = 'This is a default description for the inApp';
        if (subscription.config.subscriptionType === 'SCHEDULED' && subscription.config.customMessages?.inApp) {
          message = subscription.config.customMessages.inApp;
        }
        return { innovation: innovation.name, message };

      default:
        return {};
    }
  }

  // NOTE: This could be abstract and implemented by each of the trigger types
  protected getEmailParams(
    identity: IdentityUserInfo,
    subscription: NotifyMeSubscriptionType,
    innovation: { id: string; name: string }
  ): EmailTemplatesType[keyof EmailTemplatesType] {
    switch (this.event.type) {
      case 'SUPPORT_UPDATED':
        return {
          display_name: identity.displayName,
          innovation: innovation.name,
          event: this.event.type,
          organisation: this.getRequestUnitName(),
          supportStatus: this.event.params.status
        };

      case 'PROGRESS_UPDATE_CREATED':
        return {
          display_name: identity.displayName,
          innovation: innovation.name,
          event: this.event.type,
          unit: this.getRequestUnitName(),
          description: this.event.params.description
        };

      case 'REMINDER':
        let message = 'This is a default description for the email';
        if (subscription.config.subscriptionType === 'SCHEDULED' && subscription.config.customMessages?.email) {
          message = subscription.config.customMessages.email;
        }
        return {
          display_name: identity.displayName,
          innovation: innovation.name,
          event: this.event.type,
          message
        };

      default:
        return {};
    }
  }

  private buildInApp(
    subscription: NotifyMeSubscriptionType,
    params: InAppTemplatesType[keyof InAppTemplatesType]
  ): InAppMessageType {
    return {
      data: {
        requestUser: { id: this.event.requestUser.id },
        innovationId: this.event.innovationId,
        context: { type: 'NOTIFY_ME', detail: subscription.config.eventType, id: subscription.id },
        userRoleIds: [subscription.roleId],
        params
      }
    };
  }

  private buildEmail(
    email: string,
    subscription: NotifyMeSubscriptionType,
    params: EmailTemplatesType[keyof EmailTemplatesType]
  ): EmailMessageType {
    return {
      data: { type: subscription.config.eventType, to: email, params }
    };
  }

  private getRequestUnitName(): string {
    return this.event.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
      ? TranslationHelper.translate(`TEAMS.${this.event.requestUser.currentRole.role}`)
      : this.event.requestUser.organisation?.organisationUnit?.name ?? '';
  }
}
