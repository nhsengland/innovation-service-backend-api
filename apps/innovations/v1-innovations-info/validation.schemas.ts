import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';


export type QueryParamsType = {
  fields?: ('assessment' | 'supports')[],
}


export const QueryParamsSchema = Joi.object<QueryParamsType>({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('assessment', 'supports')).optional()
}).required();
