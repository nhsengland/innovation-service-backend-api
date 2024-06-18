import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type QueryType = {
  ids: string[];
};
export const QuerySchema = Joi.object<QueryType>({
  ids: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().guid()).min(1)
}).required();
