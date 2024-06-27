import type { NotifyMeSubscriptionEntity } from '@users/shared/entities';
import { InnovationSupportStatusEnum } from '@users/shared/enums';
import { CurrentCatalogTypes } from '@users/shared/schemas/innovation-record';
import type {
  EventType,
  ExcludeEnum,
  InnovationRecordUpdated,
  ProgressUpdateCreated,
  SubscriptionConfig,
  SubscriptionType,
  SupportUpdated
} from '@users/shared/types';
import Joi from 'joi';

//#region CreateDTO
const SupportUpdatedSchema = Joi.object<SupportUpdated>({
  eventType: Joi.string().valid('SUPPORT_UPDATED').required(),
  subscriptionType: Joi.string().valid('INSTANTLY').default('INSTANTLY'),
  preConditions: Joi.object({
    units: Joi.array().items(Joi.string().uuid()).min(1).required(),
    status: Joi.array()
      .items(
        Joi.string().valid(
          ...Object.values(InnovationSupportStatusEnum).filter(v => v !== InnovationSupportStatusEnum.UNASSIGNED)
        )
      )
      .min(1)
      .required()
  }).required()
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

export const NotifyMeConfigSchema = Joi.alternatives(
  SupportUpdatedSchema,
  ProgressUpdateCreatedSchema,
  InnovationRecordUpdatedSchema
).required();
//#endregion

//#region ResponseDTO
type OrganisationWithUnits = {
  id: string;
  name: string;
  acronym: string;
  units: {
    id: string;
    name: string;
    acronym: string;
  }[];
};

export type SubscriptionConfigType<T extends EventType> = SubscriptionConfig & { eventType: T };
export type EntitySubscriptionConfigType<T extends EventType> = NotifyMeSubscriptionEntity & {
  eventType: T;
  config: SubscriptionConfigType<T>;
};
export type PreconditionsOptions<T extends EventType> = 'preConditions' extends keyof (SubscriptionConfig & {
  eventType: T;
})
  ? keyof SubscriptionConfigType<T>['preConditions']
  : never;

export type DefaultResponseDTO<T extends EventType, K extends PreconditionsOptions<T>> = {
  id: string;
  updatedAt: Date;
  eventType: T;
  subscriptionType: SubscriptionType;
} & {
  [k in K]: 'preConditions' extends keyof (SubscriptionConfig & { eventType: T })
    ? k extends keyof SubscriptionConfigType<T>['preConditions']
      ? SubscriptionConfigType<T>['preConditions'][k]
      : never
    : never;
};

export type SupportUpdatedResponseDTO = {
  id: string;
  updatedAt: Date;
  eventType: 'SUPPORT_UPDATED';
  subscriptionType: 'INSTANTLY';
  organisations: OrganisationWithUnits[];
  status: ExcludeEnum<InnovationSupportStatusEnum, InnovationSupportStatusEnum.UNASSIGNED>[];
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
  REMINDER: DefaultResponseDTO<'REMINDER', never>;
};

export type SubscriptionResponseDTO = NotifyMeResponseTypes[keyof NotifyMeResponseTypes];
//#endregion
