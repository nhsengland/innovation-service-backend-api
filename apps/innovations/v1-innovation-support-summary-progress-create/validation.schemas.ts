import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});

export type BodyType = {
  title: string;
  description: string;
  document?: {
    name: string;
    description?: string;
    file: {
      id: string;
      name: string;
      size: number;
      extension: string;
    };
  };
};
export const BodySchema = Joi.object<BodyType>({
  title: Joi.string().max(100).required(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
  document: Joi.object<BodyType['document']>({
    name: Joi.string().max(100).required(),
    description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).optional(),
    file: Joi.object({
      id: Joi.string().max(100).required(),
      name: Joi.string().max(100).required(),
      size: Joi.number().required(),
      extension: Joi.string().max(4).required()
    }).required()
  }).optional()
}).required();
