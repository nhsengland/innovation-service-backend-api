import { ThreadContextTypeEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  subject: string;
  context?: {
    type: ThreadContextTypeEnum;
    id: string;
  };
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
};

export const ResponseBodySchema = Joi.object({
  id: Joi.string().uuid().required(),
  subject: Joi.string().required(),
  context: Joi.object({
    type: Joi.string()
      .valid(...Object.values(ThreadContextTypeEnum))
      .required(),
    id: Joi.string().uuid().required()
  }).optional(),
  createdAt: Joi.date().required(),
  createdBy: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required()
  })
});
