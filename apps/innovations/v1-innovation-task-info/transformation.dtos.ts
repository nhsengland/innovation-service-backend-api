import { InnovationTaskStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  displayId: string;
  status: InnovationTaskStatusEnum;
  section: CurrentCatalogTypes.InnovationSections;
  descriptions: {
    description: string;
    createdAt: Date;
    name: string;
    displayTag: string;
  }[];
  sameOrganisation: boolean;
  threadId: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: { name: string; displayTag: string };
  createdBy: { name: string; displayTag: string };
  assignedTo: { name: string; displayTag: string };
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  displayId: Joi.string().required(),
  status: Joi.string()
    .valid(...Object.values(InnovationTaskStatusEnum))
    .required(),
  section: Joi.string()
    .valid(...CurrentCatalogTypes.InnovationSections)
    .required(),
  descriptions: Joi.array()
    .items(
      Joi.object({
        description: Joi.string().required(),
        createdAt: Joi.date().required(),
        name: Joi.string().required(),
        displayTag: Joi.string().required()
      })
    )
    .required(),
  sameOrganisation: Joi.boolean().required(),
  threadId: Joi.string().uuid().required(),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required(),
  updatedBy: Joi.object({
    name: Joi.string().required(),
    displayTag: Joi.string().required()
  }).required(),
  createdBy: Joi.object({
    name: Joi.string().required(),
    displayTag: Joi.string().required()
  }).required(),
  assignedTo: Joi.object({
    name: Joi.string().required(),
    displayTag: Joi.string().required()
  }).required()
});
