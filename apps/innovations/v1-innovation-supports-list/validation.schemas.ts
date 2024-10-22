import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  fields: 'engagingAccessors'[];
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  fields: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(JoiHelper.AppCustomJoi().string().valid('engagingAccessors'))
    .optional()
    .default([])
}).required();
