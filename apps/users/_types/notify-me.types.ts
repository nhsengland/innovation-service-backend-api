import { InnovationSupportStatusEnum } from '@users/shared/enums';
import type {
  EventType,
  ExcludeEnum,
  ProgressUpdateCreated,
  SubscriptionType,
  SupportUpdateCreated
} from '@users/shared/types';
import Joi from 'joi';

//#region CreateDTO
const SupportUpdateCreatedSchema = Joi.object<SupportUpdateCreated>({
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

export const NotifyMeConfigSchema = Joi.alternatives(
  SupportUpdateCreatedSchema,
  ProgressUpdateCreatedSchema
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

export type DefaultResponseDTO = {
  id: string;
  updatedAt: Date;
  eventType: EventType;
  subscriptionType: SubscriptionType;
};
export type SupportUpdateResponseDTO = {
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

export type SupportUpdateResponseTypes = {
  SUPPORT_UPDATED: SupportUpdateResponseDTO;
  PROGRESS_UPDATE_CREATED: ProgressUpdateCreatedResponseDTO;
  REMINDER: DefaultResponseDTO;
};

export type SubscriptionResponseDTO = SupportUpdateResponseTypes[keyof SupportUpdateResponseTypes];
//#endregion
