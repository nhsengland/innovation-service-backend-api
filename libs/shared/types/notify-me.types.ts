import type { InnovationSupportStatusEnum } from '../enums';
import type { InnovationSectionGroups } from '../schemas/innovation-record/202304/catalog.types';
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

// TODO: Untying SubscriptionConfig from the EventPayloads, validate with Diogo, Progress update created also had unitId and some other stuff
// that seems to be extra information, the validator for the event listener is the payload.
// The listener will be generic as it currently is
export type SupportUpdated = {
  eventType: 'SUPPORT_UPDATED';
  subscriptionType: 'INSTANTLY';
  preConditions: {
    units: string[];
    status: ExcludeEnum<InnovationSupportStatusEnum, InnovationSupportStatusEnum.UNASSIGNED>[];
  };
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
    sections?: InnovationSectionGroups[];
  };
};

export type SubscriptionConfig =
  | SupportUpdated
  | ProgressUpdateCreated
  | InnovationRecordUpdated
  | {
      eventType: 'REMINDER';
      subscriptionType: SubscriptionType;
      date: Date;
      customMessages?: any;
    }; // TODO

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
  };
  PROGRESS_UPDATE_CREATED: {
    units: string;
  };
  REMINDER: Record<string, never>;
};
export const EventType = ['SUPPORT_UPDATED', 'PROGRESS_UPDATE_CREATED', 'REMINDER'] as const;
export type EventType = (typeof EventType)[number];

/**
 * Subscription Types
 * Contains the subscription types and specific payloads configurations that each contain.
 */
export type SubscriptionType = SubscriptionTypes['subscriptionType'];
export type SubscriptionTypes = InstantSubscriptionType | ScheduledSubscriptionType; // | PeriodicSubscriptionType;
export type InstantSubscriptionType = { subscriptionType: 'INSTANTLY' };
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
