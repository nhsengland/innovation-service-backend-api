import { JoiHelper } from '@admin/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  userId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  includeAsCollaborator?: boolean;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  includeAsCollaborator: Joi.boolean().optional()
});
