import type { ObjectSchema } from 'joi';
import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@notifications/shared/constants';
import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import type { DomainContextType, EventPayloads } from '@notifications/shared/types';
import { DomainContextSchema, EventType } from '@notifications/shared/types';
import { JoiHelper } from '@notifications/shared/helpers';

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
    innovationId: JoiHelper.AppCustomJoi().string().required(),

    type: JoiHelper.AppCustomJoi()
      .string()
      .valid(...Object.values(EventType))
      .required(),

    params: Joi.object().required()
  }).required()
}).required();

const RequiredIdSchema = JoiHelper.AppCustomJoi().string().guid().required();
export const EventParamsSchema: { [key in EventType]: ObjectSchema<EventPayloads[key]> } = {
  SUPPORT_UPDATED: Joi.object<EventPayloads['SUPPORT_UPDATED']>({
    status: JoiHelper.AppCustomJoi()
      .string()
      .valid(...Object.values(InnovationSupportStatusEnum))
      .required(),
    units: RequiredIdSchema,
    message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
  }).required(),
  PROGRESS_UPDATE_CREATED: Joi.object<EventPayloads['PROGRESS_UPDATE_CREATED']>({
    units: RequiredIdSchema
  }).required(),
  INNOVATION_RECORD_UPDATED: Joi.object<EventPayloads['INNOVATION_RECORD_UPDATED']>({
    sections: JoiHelper.AppCustomJoi()
      .string()
      .valid(...CurrentCatalogTypes.InnovationSections)
  }).required(),
  DOCUMENT_UPLOADED: Joi.object<EventPayloads['DOCUMENT_UPLOADED']>({
    documentName: JoiHelper.AppCustomJoi().string().required()
  }).required(),
  REMINDER: Joi.object<EventPayloads['REMINDER']>({
    subscriptionId: JoiHelper.AppCustomJoi().string().guid().required()
  }).required()
};
