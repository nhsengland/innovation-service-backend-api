import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name?: string;
  role?: string;
  email: string;
  status: InnovationCollaboratorStatusEnum;
  innovation: {
    id: string;
    name: string;
    description?: string;
    owner?: {
      id: string;
      name?: string;
    };
  };
  invitedAt: Date;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  name: Joi.string().optional(),
  role: Joi.string().optional(),
  email: Joi.string().required(),
  status: Joi.string().valid(...Object.values(InnovationCollaboratorStatusEnum)),
  innovation: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    description: Joi.string().optional(),
    owner: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().optional()
    }).optional()
  }).required(),
  invitedAt: Joi.date().required()
});
