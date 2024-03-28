import type { DomainContextType } from "./domain.types";

export type NotifyMeMessageType<T extends EventType> = {
  data: {
    requestUser: DomainContextType;
    innovationId: string;

    type: T;

    params: EventPayloads[T];
  };
};

export type SubscriptionConfig = TriggerConfigFromEventPayloads & SubscriptionTypes;

/*
 * Event Types
 * Contains the information related with the event payloads and the existing event
 * types. This is the structure to change everytime new events are registered in notify me.
 */
export type EventPayloads = {
  SUPPORT_UPDATED: {
    supportId: string;
    status: string;
    updatedByOrg: string;
    updatedByUnit: string;
  };
  PROGRESS_UPDATE_CREATED: {
    unitId: string;
    description: string;
  };
  REMINDER: Record<string, never>;
};
export type EventType = keyof EventPayloads;

/**
 * Subscription Types
 * Contains the subscription types and specific payloads configurations that each contain.
 */
export type SubscriptionType = SubscriptionTypes['subscriptionType'];
type SubscriptionTypes = InstantSubscriptionType | ScheduledSubscriptionType | PeriodicSubscriptionType;
export type InstantSubscriptionType = { subscriptionType: 'INSTANTLY' };
export type ScheduledSubscriptionType = {
  subscriptionType: 'SCHEDULED';
  date: Date;
  customMessages?: { inApp?: string; email?: string };
};
export type PeriodicSubscriptionType = { subscriptionType: 'PERIODIC'; periodicity: 'HOURLY' | 'DAILY' };

/**
 * Helpers
 */
// Helper to infer the trigger config and pre-conditions from the Event Payloads
type TriggerConfigFromEventPayloads = {
  [K in EventType]: {
    eventType: K;
    preConditions: Partial<{ [X in keyof EventPayloads[K]]: EventPayloads[K][X] | EventPayloads[K][X][] }>;
  };
}[keyof EventPayloads];
