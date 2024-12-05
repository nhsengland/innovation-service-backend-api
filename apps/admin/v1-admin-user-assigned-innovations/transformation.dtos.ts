import { ServiceRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    innovation: { id: string; name: string };
    supportedBy: { id: string; name: string; role: ServiceRoleEnum }[];
    unit: string;
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  data: Joi.array()
    .items(
      Joi.object({
        innovation: Joi.object({
          id: Joi.string().uuid().required(),
          name: Joi.string().required()
        }),
        supportedBy: Joi.array().items(
          Joi.object({
            id: Joi.string().uuid().required(),
            name: Joi.string().required(),
            role: Joi.string().valid(...Object.values(ServiceRoleEnum))
          })
        )
      })
    )
    .required()
});
