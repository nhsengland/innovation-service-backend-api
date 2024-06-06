import Joi, { ObjectSchema } from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@notifications/shared/constants';
import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { DomainContextSchema, DomainContextType, EventPayloads, EventType } from '@notifications/shared/types';

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

    type: Joi.string()
      .valid(...Object.values(EventType))
      .required(),

    params: Joi.object().required()
  }).required()
}).required();

const RequiredIdSchema = Joi.string().guid().required();
export const EventParamsSchema: { [key in EventType]: ObjectSchema<EventPayloads[key]> } = {
  SUPPORT_UPDATED: Joi.object<EventPayloads['SUPPORT_UPDATED']>({
    status: Joi.string()
      .valid(...Object.values(InnovationSupportStatusEnum))
      .required(),
    supportId: RequiredIdSchema,
    updatedByUnit: RequiredIdSchema
  }).required(),
  PROGRESS_UPDATE_CREATED: Joi.object<EventPayloads['PROGRESS_UPDATE_CREATED']>({
    unitId: RequiredIdSchema,
    description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
  }).required(),
  REMINDER: Joi.object<EventPayloads['REMINDER']>({})
};
