import { GenericErrorsEnum, NotImplementedError } from '@notifications/shared/errors';
import { TranslationHelper } from '@notifications/shared/helpers';
import type { DomainContextType, EventPayloads, EventType } from '@notifications/shared/types';
import { isArray } from 'lodash';
import type { EntityManager } from 'typeorm';
import type { EmailTemplatesType } from '../_config';
import type { InAppTemplatesType } from '../_config/inapp.config';
import { HandlersHelper } from '../_helpers/handlers.helper';
import {
  documentsUrl,
  innovationOverviewUrl,
  innovationRecordSectionUrl,
  supportSummaryUrl,
  unsubscribeUrl
} from '../_helpers/url.helper';
import type { NotifyMeService, NotifyMeSubscriptionType } from '../_services/notify-me.service';
import type { RecipientType, RecipientsService } from '../_services/recipients.service';
import type { MessageType as EmailMessageType } from '../v1-emails-listener/validation.schemas';
import type { MessageType as InAppMessageType } from '../v1-in-app-listener/validation.schemas';
import { randomUUID } from 'crypto';

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
// This would help remove some of the clutter from the "BaseHandler"
export class NotifyMeHandler {
  private event: EventPayload;

  #inApps: InAppMessageType[] = [];
  get inApps(): InAppMessageType[] {
    return this.#inApps;
  }
  #emails: EmailMessageType[] = [];
  get emails(): EmailMessageType[] {
    return this.#emails;
  }

  constructor(
    private notifyMeService: NotifyMeService,
    private recipientsService: RecipientsService,
    event: EventPayload
  ) {
    this.event = event;
  }

  public async execute(transaction: EntityManager): Promise<void> {
    const eventSubscriptions = await this.notifyMeService.getInnovationEventSubscriptions(
      this.event.innovationId,
      this.event.type,
      transaction
    );

    const subscriptions = [];
    for (const subscriber of eventSubscriptions) {
      if (this.validatePreconditions(subscriber)) {
        subscriptions.push(subscriber);
      }
    }
    if (!subscriptions.length) return;

    const innovation = await this.recipientsService.innovationInfo(this.event.innovationId, false, transaction);
    const subscribers = Array.from(new Set(subscriptions.map(t => t.roleId)));
    const recipients = new Map(
      (await this.recipientsService.getRecipientsByRoleId(subscribers, transaction)).map(r => [r.roleId, r])
    );
    const identities = await this.recipientsService.usersIdentityInfo([...recipients.values()].map(r => r.identityId));
    const preferences = await this.recipientsService.getEmailPreferences(subscribers, transaction);

    for (const subscription of subscriptions) {
      const recipient = recipients.get(subscription.roleId);
      if (!recipient) continue;

      const identity = identities.get(recipient.identityId);
      if (!identity) continue;

      const shouldSendEmail = HandlersHelper.shouldSendEmail('NOTIFY_ME', preferences.get(subscription.roleId));
      const notificationId = randomUUID();

      const params = {
        inApp: this.getInAppParams(subscription, innovation),
        email: {
          ...this.getEmailParams(recipient, subscription, innovation, notificationId),
          displayName: identity.displayName,
          unsubscribeUrl: unsubscribeUrl
        }
      };

      const inAppPayload = this.buildInApp(subscription, params.inApp, notificationId);
      const emailPayload = shouldSendEmail && this.buildEmail(identity.email, subscription, params.email);

      if (emailPayload) {
        this.#emails.push(emailPayload);
      }
      this.#inApps.push(inAppPayload);

      if (subscription.config.subscriptionType === 'ONCE') {
        await this.notifyMeService.deleteSubscription(subscription.id, transaction);
      }
    }
  }

  // This function checks the subscription config and for each setting in the config it ensures that if the event has
  // that setting it will be in the list of the settings.
  // Additionally if the event is does not have the field but it is in the preconditions it will return true!
  protected validatePreconditions(subscription: NotifyMeSubscriptionType): boolean {
    if (this.event.type !== subscription.config.eventType) return false;

    // If the event specifies a subscriptionId ensure that the subscriptionId matches the one in the event (ie: REMINDER)
    if ('subscriptionId' in this.event.params && this.event.params.subscriptionId !== subscription.id) return false;

    if (!('preConditions' in subscription.config)) return true;

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
          organisation: HandlersHelper.getRequestUnitName(this.event.requestUser),
          supportStatus: TranslationHelper.translate(`SUPPORT_STATUS.${this.event.params.status}`).toLowerCase(),
          unitId: this.event.params.units
        };

      case 'PROGRESS_UPDATE_CREATED':
        return {
          innovation: innovation.name,
          organisation: HandlersHelper.getRequestUnitName(this.event.requestUser),
          event: this.event.type,
          unitId: this.event.params.units
        };

      case 'INNOVATION_RECORD_UPDATED':
        return {
          innovation: innovation.name,
          section: this.event.params.sections,
          sectionLabel: TranslationHelper.translate(`SECTION.${this.event.params.sections}`).toLowerCase(),
          event: this.event.type
        };

      case 'DOCUMENT_UPLOADED':
        return {
          innovationName: innovation.name,
          documentName: this.event.params.documentName,
          event: this.event.type
        };

      case 'REMINDER': {
        let message = 'This is a default description for the inApp';
        if (subscription.config.subscriptionType === 'SCHEDULED' && subscription.config.customMessage) {
          message = subscription.config.customMessage;
        }
        return { event: this.event.type, innovation: innovation.name, reason: message };
      }

      default:
        return {};
    }
  }

  // NOTE: This could be abstract and implemented by each of the trigger types
  protected getEmailParams(
    recipient: RecipientType,
    subscription: NotifyMeSubscriptionType,
    innovation: { id: string; name: string },
    notificationId: string
  ): EmailTemplatesType[EventType] {
    switch (this.event.type) {
      case 'SUPPORT_UPDATED':
        return {
          innovation: innovation.name,
          organisation: HandlersHelper.getRequestUnitName(this.event.requestUser),
          supportStatus: TranslationHelper.translate(`SUPPORT_STATUS.${this.event.params.status}`).toLowerCase(),
          supportSummaryUrl: supportSummaryUrl(
            recipient.role,
            this.event.innovationId,
            notificationId,
            this.event.requestUser.organisation?.organisationUnit?.id
          ),
          ...('notificationType' in subscription.config &&
            subscription.config.notificationType === 'SUGGESTED_SUPPORT_UPDATED' && {
              message: this.event.params.message
            })
        };

      case 'PROGRESS_UPDATE_CREATED':
        return {
          innovation: innovation.name,
          organisation: HandlersHelper.getRequestUnitName(this.event.requestUser),
          supportSummaryUrl: supportSummaryUrl(
            recipient.role,
            this.event.innovationId,
            notificationId,
            this.event.requestUser.organisation?.organisationUnit?.id
          )
        };
      case 'INNOVATION_RECORD_UPDATED':
        return {
          innovation: innovation.name,
          section: TranslationHelper.translate(`SECTION.${this.event.params.sections}`).toLowerCase(),
          sectionUrl: innovationRecordSectionUrl(
            recipient.role,
            this.event.innovationId,
            this.event.params.sections,
            notificationId
          )
        };
      case 'DOCUMENT_UPLOADED':
        return {
          innovation_name: innovation.name,
          document_name: this.event.params.documentName,
          documents_url: documentsUrl(recipient.role, innovation.id, notificationId)
        };
      case 'REMINDER': {
        let message = 'This is a default description for the email';
        if (subscription.config.subscriptionType === 'SCHEDULED' && subscription.config.customMessage) {
          message = subscription.config.customMessage;
        }
        return {
          innovation: innovation.name,
          reason: message,
          innovation_overview_url: innovationOverviewUrl(recipient.role, innovation.id, notificationId)
        };
      }

      default: {
        const r: never = this.event;
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, { details: r });
      }
    }
  }

  private buildInApp(
    subscription: NotifyMeSubscriptionType,
    params: InAppTemplatesType[keyof InAppTemplatesType],
    notificationId: string
  ): InAppMessageType {
    const type =
      'notificationType' in subscription.config ? subscription.config.notificationType : subscription.config.eventType;
    return {
      data: {
        requestUser: { id: this.event.requestUser.id },
        innovationId: this.event.innovationId,
        context: { type: 'NOTIFY_ME', detail: type, id: subscription.id },
        userRoleIds: [subscription.roleId],
        params,
        notificationId
      }
    };
  }

  private buildEmail(
    email: string,
    subscription: NotifyMeSubscriptionType,
    params: EmailTemplatesType[EventType] & { displayName: string; unsubscribeUrl: string }
  ): EmailMessageType {
    const type =
      'notificationType' in subscription.config ? subscription.config.notificationType : subscription.config.eventType;
    return {
      data: { type: type, to: email, params }
    };
  }
}
