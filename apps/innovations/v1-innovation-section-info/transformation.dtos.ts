import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ResponseDTO = {
  id: null | string;
  section: CurrentCatalogTypes.InnovationSections;
  status: InnovationSectionStatusEnum;
  submittedAt: null | Date;
  submittedBy: null | { name: string; displayTag: string };
  data: null | { [key: string]: any };
  tasksIds?: string[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().allow(null).required(),
  section: Joi.string()
    .valid(...Object.values(CurrentCatalogTypes.InnovationSections))
    .required(),
  status: Joi.string()
    .valid(...Object.values(InnovationSectionStatusEnum))
    .required(),
  submittedAt: Joi.date().allow(null).required(),
  submittedBy: Joi.object({
    name: Joi.string().required(),
    displayTag: Joi.string().required()
  })
    .allow(null)
    .required(),
  data: Joi.object().pattern(Joi.string, Joi.any).allow(null).required(),
  tasksIds: Joi.array().items(Joi.string()).optional()
});
