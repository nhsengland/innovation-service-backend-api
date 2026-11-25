import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    displayId: string;
    innovation: { id: string; name: string };
    status: InnovationTaskStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
    sameOrganisation: boolean;
    notifications?: number;
    createdAt: Date;
    createdBy: { name: string; displayTag: string };
    updatedAt: Date;
    updatedBy: { name: string; displayTag: string };
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  data: Joi.object({
    id: Joi.string().uuid().required(),
    displayId: Joi.string().required(),
    innovation: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required()
    }).required(),
    status: Joi.string()
      .valid(...Object.values(InnovationTaskStatusEnum))
      .required(),
    section: Joi.string()
      .valid(...CurrentCatalogTypes.InnovationSections)
      .required(),
    sameOrganisation: Joi.boolean().required(),
    notifications: Joi.number().integer().required(),
    createdAt: Joi.date().required(),
    createdBy: Joi.object({
      name: Joi.string().required(),
      displayTag: Joi.string().required()
    }).required(),
    updatedAt: Joi.date().required(),
    updatedBy: Joi.object({
      name: Joi.string().required(),
      displayTag: Joi.string().required()
    }).required()
  })
});
