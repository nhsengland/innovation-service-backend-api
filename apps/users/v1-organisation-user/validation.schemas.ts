import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  organisationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  email: string;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  email: JoiHelper.AppCustomJoi().decodeURIString().email().lowercase().required()
}).required();
