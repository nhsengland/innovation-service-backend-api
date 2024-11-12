import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    name?: string;
    role?: string;
    email?: string;
    status: InnovationCollaboratorStatusEnum;
    isActive?: boolean;
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  data: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().optional(),
        role: Joi.string().optional(),
        email: Joi.string().optional(),
        status: Joi.string().valid(...Object.values(InnovationCollaboratorStatusEnum)),
        isActive: Joi.boolean().optional()
      })
    )
    .required()
});
