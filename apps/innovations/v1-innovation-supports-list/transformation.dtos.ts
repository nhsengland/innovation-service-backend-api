import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  status: InnovationSupportStatusEnum;
  organisation: {
    id: string;
    name: string;
    acronym: string;
    unit: { id: string; name: string; acronym: string };
  };
  engagingAccessors?: { id: string; userRoleId: string; name: string; isActive: boolean }[];
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    status: Joi.string()
      .valid(...Object.values(InnovationSupportStatusEnum))
      .required(),
    organisation: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      acronym: Joi.string().required(),
      unit: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        acronym: Joi.string().required()
      })
    }),
    engagingAccessors: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().uuid().required(),
          userRoleId: Joi.string().required(),
          name: Joi.string().required(),
          isActive: Joi.boolean().required()
        })
      )
      .optional()
  })
);
