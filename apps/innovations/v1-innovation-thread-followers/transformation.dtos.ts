import { ServiceRoleEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  followers: {
    id: string;
    name: string;
    isLocked: boolean;
    isOwner?: boolean;
    role: { id: string; role: ServiceRoleEnum };
    organisationUnit: { id: string; name: string; acronym: string } | null;
  }[];
};

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    followers: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      isLocked: Joi.boolean().required(),
      isOwner: Joi.boolean().optional(),
      role: Joi.object({
        id: Joi.string().uuid().required(),
        role: Joi.string()
          .valid(...Object.values(ServiceRoleEnum))
          .required()
      }),
      organisationUnit: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        acronym: Joi.string().required()
      })
        .allow(null)
        .required()
    })
  })
);
