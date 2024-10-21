import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  organisationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  onlyActiveUsers: boolean;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  onlyActiveUsers: Joi.boolean().default(true).optional()
}).required();
