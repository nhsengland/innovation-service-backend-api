import Joi from 'joi';
import type { SubscriptionResponseDTO } from '../_types/notify-me.types';

export type ResponseDTO = {
  innovationId: string;
  name: string;
  count: number;
  subscriptions?: SubscriptionResponseDTO[];
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    innovationId: Joi.string().uuid().required(),
    name: Joi.string().required(),
    count: Joi.number().integer().required(),
    subscriptions: Joi.object().optional()
  })
);
