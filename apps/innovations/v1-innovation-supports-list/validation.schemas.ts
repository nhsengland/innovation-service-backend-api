import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();


export type QueryParamsType = {
  fields?: ('engagingAccessors')[];
}
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('engagingAccessors')).optional()
}).required();
