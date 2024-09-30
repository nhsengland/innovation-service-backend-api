import type { NotifyMeSubscriptionEntity } from '@users/shared/entities';
import { InnovationSupportStatusEnum } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';
import { CurrentCatalogTypes } from '@users/shared/schemas/innovation-record';
import type {
  EventType,
  ExcludeEnum,
  InnovationRecordUpdated,
  ProgressUpdateCreated,
  Reminder,
  SubscriptionConfig,
  SubscriptionType,
  SupportUpdated
} from '@users/shared/types';
import Joi from 'joi';

//#region CreateDTO
const SupportUpdatedSchema = Joi.object<SupportUpdated>({
  eventType: Joi.string().valid('SUPPORT_UPDATED').required(),
  subscriptionType: Joi.string().valid('INSTANTLY', 'ONCE').default('INSTANTLY'),
  preConditions: Joi.object({
    units: Joi.array().items(Joi.string().uuid()).min(1).required(),
    status: Joi.array()
      .items(
        Joi.string().valid(
          ...Object.values(InnovationSupportStatusEnum).filter(v => v !== InnovationSupportStatusEnum.SUGGESTED) // TODO MJS - Check if this is correct
        )
      )
      .min(1)
      .required()
  }).required(),
  notificationType: Joi.string().valid('SUPPORT_UPDATED', 'SUGGESTED_SUPPORT_UPDATED').default('SUPPORT_UPDATED')
}).required();

const ProgressUpdateCreatedSchema = Joi.object<ProgressUpdateCreated>({
  eventType: Joi.string().valid('PROGRESS_UPDATE_CREATED').required(),
  subscriptionType: Joi.string().valid('INSTANTLY').default('INSTANTLY'),
  preConditions: Joi.object({
    units: Joi.array().items(Joi.string().uuid()).min(1).required()
  }).required()
}).required();

const InnovationRecordUpdatedSchema = Joi.object<InnovationRecordUpdated>({
  eventType: Joi.string().valid('INNOVATION_RECORD_UPDATED').required(),
  subscriptionType: Joi.string().valid('INSTANTLY').default('INSTANTLY'),
  preConditions: Joi.object({
    sections: Joi.array()
      .items(Joi.string().valid(...CurrentCatalogTypes.InnovationSections))
      .min(1)
      .optional()
  }).required()
}).required();

const ReminderSchema = Joi.object<Reminder>({
  eventType: Joi.string().valid('REMINDER').required(),
  subscriptionType: Joi.string().valid('SCHEDULED').default('SCHEDULED'),
  customMessage: Joi.string().required(),
  date: JoiHelper.AppCustomJoi().dateWithDefaultTime().defaultTime('07:00').required()
});

export const NotifyMeConfigSchema = Joi.alternatives(
  SupportUpdatedSchema,
  ProgressUpdateCreatedSchema,
  InnovationRecordUpdatedSchema,
  ReminderSchema
).required();
//#endregion

//#region ResponseDTO
export type OrganisationWithUnits = {
  id: string;
  name: string;
  acronym: string;
  units: {
    id: string;
    name: string;
    acronym: string;
    isShadow: boolean;
  }[];
};

export type SubscriptionConfigType<T extends EventType> = SubscriptionConfig & { eventType: T };
export type EntitySubscriptionConfigType<T extends EventType> = NotifyMeSubscriptionEntity & {
  eventType: T;
  config: SubscriptionConfigType<T>;
};
type PreconditionsOptions<T extends EventType> = 'preConditions' extends keyof (SubscriptionConfig & {
  eventType: T;
})
  ? keyof SubscriptionConfigType<T>['preConditions']
  : never;
export type DefaultOptions<T extends EventType> =
  | PreconditionsOptions<T>
  | keyof Omit<SubscriptionConfigType<T>, 'id' | 'eventType' | 'subscriptionType' | 'preConditions'>;

export type DefaultResponseDTO<T extends EventType, K extends DefaultOptions<T>> = {
  id: string;
  updatedAt: Date;
  eventType: T;
  subscriptionType: SubscriptionType;
} & {
  [k in K]: 'preConditions' extends keyof (SubscriptionConfig & { eventType: T })
    ? k extends keyof SubscriptionConfigType<T>['preConditions']
      ? SubscriptionConfigType<T>['preConditions'][k]
      : k extends keyof SubscriptionConfigType<T>
        ? SubscriptionConfigType<T>[k]
        : never
    : k extends keyof SubscriptionConfigType<T>
      ? SubscriptionConfigType<T>[k]
      : never;
};

export type SupportUpdatedResponseDTO = {
  id: string;
  updatedAt: Date;
  eventType: 'SUPPORT_UPDATED';
  subscriptionType: 'INSTANTLY' | 'ONCE';
  organisations: OrganisationWithUnits[];
  status: ExcludeEnum<InnovationSupportStatusEnum, InnovationSupportStatusEnum.SUGGESTED>[];
  notificationType: 'SUPPORT_UPDATED' | 'SUGGESTED_SUPPORT_UPDATED';
};

export type ProgressUpdateCreatedResponseDTO = {
  id: string;
  updatedAt: Date;
  eventType: 'PROGRESS_UPDATE_CREATED';
  subscriptionType: 'INSTANTLY';
  organisations: OrganisationWithUnits[];
};

export type InnovationRecordUpdatedResponseDTO = {
  id: string;
  updatedAt: Date;
  eventType: 'INNOVATION_RECORD_UPDATED';
  subscriptionType: 'INSTANTLY';
  sections?: CurrentCatalogTypes.InnovationSections[];
};

export type NotifyMeResponseTypes = {
  SUPPORT_UPDATED: SupportUpdatedResponseDTO;
  PROGRESS_UPDATE_CREATED: ProgressUpdateCreatedResponseDTO;
  INNOVATION_RECORD_UPDATED: DefaultResponseDTO<'INNOVATION_RECORD_UPDATED', 'sections'>;
  REMINDER: DefaultResponseDTO<'REMINDER', 'customMessage' | 'date'>;
};

export type SubscriptionResponseDTO = NotifyMeResponseTypes[keyof NotifyMeResponseTypes];
//#endregion
