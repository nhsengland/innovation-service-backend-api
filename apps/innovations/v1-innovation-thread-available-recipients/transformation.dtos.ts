import { InnovationRelevantOrganisationsStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  status: InnovationRelevantOrganisationsStatusEnum;
  organisation: {
    id: string;
    name: string;
    acronym: string;
    unit: { id: string; name: string; acronym: string };
  };
  recipients: { id: string; roleId: string; name: string }[];
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    status: Joi.string().valid(...Object.values(InnovationRelevantOrganisationsStatusEnum)),
    organisation: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      acronym: Joi.string().required(),
      unit: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        acronym: Joi.string().required()
      })
    }).required(),
    recipients: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required()
    })
  })
);
