import type { InnovationSupportStatusEnum } from '../enums';
import type { CurrentCatalogTypes } from '../schemas/innovation-record';
import type { DomainContextType } from './domain.types';
import type { ExcludeEnum } from './helper.types';

export type NotifyMeMessageType<T extends EventType> = {
  data: {
    requestUser: DomainContextType;
    innovationId: string;

    type: T;

    params: EventPayloads[T];
  };
};

// export type SubscriptionConfig = TriggerConfigFromEventPayloads & SubscriptionTypes;

export type SupportUpdated = {
  eventType: 'SUPPORT_UPDATED';
  subscriptionType: 'INSTANTLY' | 'ONCE';
  preConditions: {
    units: string[];
    status: ExcludeEnum<
      InnovationSupportStatusEnum,
      InnovationSupportStatusEnum.SUGGESTED | InnovationSupportStatusEnum.UNASSIGNED
    >[];
  };
  notificationType: 'SUPPORT_UPDATED' | 'SUGGESTED_SUPPORT_UPDATED';
};

export type ProgressUpdateCreated = {
  eventType: 'PROGRESS_UPDATE_CREATED';
  subscriptionType: 'INSTANTLY';
  preConditions: {
    units: string[];
  };
};

export type InnovationRecordUpdated = {
  eventType: 'INNOVATION_RECORD_UPDATED';
  subscriptionType: 'INSTANTLY';
  preConditions: {
    sections?: CurrentCatalogTypes.InnovationSections[];
  };
};

export type DocumentUploaded = {
  eventType: 'DOCUMENT_UPLOADED';
  subscriptionType: 'INSTANTLY';
};

export type Reminder = {
  eventType: 'REMINDER';
  subscriptionType: 'SCHEDULED';
  date: Date;
  customMessage: string;
};

export type SubscriptionConfig =
  | SupportUpdated
  | ProgressUpdateCreated
  | InnovationRecordUpdated
  | DocumentUploaded
  | Reminder;

export const isSupportUpdated = (config: SubscriptionConfig): config is SupportUpdated => {
  return config.eventType === 'SUPPORT_UPDATED';
};
export const isProgressUpdateCreated = (config: SubscriptionConfig): config is ProgressUpdateCreated => {
  return config.eventType === 'PROGRESS_UPDATE_CREATED';
};

/*
 * Event Types
 * Contains the information related with the event payloads and the existing event
 * types. This is the structure to change everytime new events are registered in notify me.
 */
// Preconditions
export type EventPayloads = {
  SUPPORT_UPDATED: {
    status: InnovationSupportStatusEnum;
    units: string;
    message: string;
  };
  PROGRESS_UPDATE_CREATED: {
    units: string;
  };
  INNOVATION_RECORD_UPDATED: {
    sections: CurrentCatalogTypes.InnovationSections;
  };
  DOCUMENT_UPLOADED: {
    documentName: string;
  };
  REMINDER: {
    subscriptionId: string;
  };
};
export const EventType = [
  'SUPPORT_UPDATED',
  'PROGRESS_UPDATE_CREATED',
  'INNOVATION_RECORD_UPDATED',
  'DOCUMENT_UPLOADED',
  'REMINDER'
] as const;
export type EventType = (typeof EventType)[number];

/**
 * Subscription Types
 * Contains the subscription types and specific payloads configurations that each contain.
 */
export type SubscriptionType = SubscriptionTypes['subscriptionType'];
export type SubscriptionTypes = InstantSubscriptionType | ScheduledSubscriptionType | OnceSubscriptionType; // | PeriodicSubscriptionType;
export type InstantSubscriptionType = { subscriptionType: 'INSTANTLY' };
export type OnceSubscriptionType = { subscriptionType: 'ONCE' };
export type ScheduledSubscriptionType = {
  subscriptionType: 'SCHEDULED';
  date: Date;
  customMessages?: { inApp?: string; email?: string };
};
// export type PeriodicSubscriptionType = { subscriptionType: 'PERIODIC'; periodicity: 'HOURLY' | 'DAILY' };

/**
 * Helpers
 */
// Helper to infer the trigger config and pre-conditions from the Event Payloads
export type TriggerConfigFromEventPayloads<T extends keyof EventPayloads = keyof EventPayloads> = {
  [K in EventType]: {
    eventType: K;
    preConditions: Partial<{ [X in keyof EventPayloads[K]]: EventPayloads[K][X] | EventPayloads[K][X][] }>;
  };
}[T];
