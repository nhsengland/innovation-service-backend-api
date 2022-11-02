import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { YesOrNoCatalogueEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  updatedInnovationRecord: YesOrNoCatalogueEnum,
  changes: string,
}
export const BodySchema = Joi.object<BodyType>({
  updatedInnovationRecord: Joi.string().valid(...Object.values(YesOrNoCatalogueEnum)).required(),
  changes: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).required()
}).required();
