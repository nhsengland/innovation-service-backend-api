import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { YesOrNoCatalogueType } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
}).required();

export type BodyType = {
  updatedInnovationRecord: YesOrNoCatalogueType;
  description: string;
};
export const BodySchema = Joi.object<BodyType>({
  updatedInnovationRecord: Joi.string()
    .valid(...Object.values(YesOrNoCatalogueType))
    .required(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).required(),
}).required();
