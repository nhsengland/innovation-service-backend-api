import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = { innovations: InnovationDTO[]; count: number };

export type InnovationDTO = {
  id: string;
  name: string;
  supportStatus: InnovationSupportStatusEnum;
  dueDate: Date;
  dueDays: number;
};

export const ResponseBodySchema = Joi.object({
  innovations: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      supportStatus: Joi.required(),
      dueDate: Joi.date().required(),
      dueDays: Joi.number().integer().required()
    })
  ),
  count: Joi.number().integer().required()
});
