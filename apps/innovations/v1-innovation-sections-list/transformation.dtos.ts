import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ResponseDTO = {
  id: null | string;
  section: CurrentCatalogTypes.InnovationSections;
  status: InnovationSectionStatusEnum;
  submittedAt: null | Date;
  submittedBy: null | {
    name: string;
    isOwner?: boolean;
  };
  openTasksCount: number;
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().allow(null).required(),
    section: Joi.string().valid(...CurrentCatalogTypes.InnovationSections),
    status: Joi.string().valid(...Object.values(InnovationSectionStatusEnum)),
    submittedAt: Joi.date().allow(null).required(),
    submittedBy: Joi.object({
      name: Joi.string().required(),
      isOwner: Joi.boolean().optional()
    })
      .allow(null)
      .required(),
    openTasksCount: Joi.number().integer().required()
  })
);
