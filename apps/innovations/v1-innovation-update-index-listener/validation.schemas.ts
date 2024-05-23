import { ElasticSearchEventUpdateMessageType, ElasticSearchEventUpdateTypes } from '@innovations/shared/decorators';
import Joi from 'joi';

export type EventMessageType = ElasticSearchEventUpdateMessageType;

export const EventMessageSchema = Joi.object<EventMessageType>({
  data: {
    innovationId: Joi.string().guid().required(),
    type: Joi.string().valid(...ElasticSearchEventUpdateTypes)
  }
});
