import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  supportId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  supportId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  includeInactive?: boolean;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  includeInactive: Joi.boolean().optional()
}).required();
