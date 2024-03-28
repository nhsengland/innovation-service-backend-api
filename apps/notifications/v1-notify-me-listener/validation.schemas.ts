import Joi, { ObjectSchema } from 'joi';

import { DomainContextSchema, DomainContextType, EventPayloads, EventType } from '@notifications/shared/types';
import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { TEXTAREA_LENGTH_LIMIT } from '@notifications/shared/constants';

export type MessageType = {
  data: {
    requestUser: DomainContextType;
    innovationId: string;

    type: EventType;

    params: EventPayloads[EventType];
  };
};

export const MessageSchema = Joi.object<MessageType>({
  data: Joi.object<MessageType['data']>({
    requestUser: DomainContextSchema.required(),
    innovationId: Joi.string().required(),

    // TODO: This should be validated against an Array or Enum
    type: Joi.string().required(),

    params: Joi.object().required()
  }).required()
}).required();

const RequiredIdSchema = Joi.string().guid().required();
export const EventParamsSchema: { [key in EventType]: ObjectSchema<EventPayloads[key]> } = {
  SUPPORT_UPDATED: Joi.object({
    status: Joi.string()
      .valid(...Object.values(InnovationSupportStatusEnum))
      .required(),
    supportId: RequiredIdSchema,
    updatedByOrg: RequiredIdSchema,
    updatedByUnit: RequiredIdSchema
  }).required(),
  PROGRESS_UPDATE_CREATED: Joi.object({
    unitId: RequiredIdSchema,
    description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
  }).required(),
  REMINDER: Joi.object({})
};
