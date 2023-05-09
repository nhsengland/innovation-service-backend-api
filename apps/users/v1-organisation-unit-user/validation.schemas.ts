import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  organisationUnitId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationUnitId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  email: string;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  email: JoiHelper.AppCustomJoi().decodeURIString().email().lowercase().required()
}).required();
