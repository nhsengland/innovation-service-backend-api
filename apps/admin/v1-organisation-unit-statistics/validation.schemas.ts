import { JoiHelper } from '@admin/shared/helpers';
import Joi from 'joi';

// set the possible statistics here
export const statistics = ['INNOVATIONS_PER_UNIT'] as const;

export type ParamsType = {
  unit: string;
};

export type QueryType = {
  statistics: (typeof statistics)[number][];
};

export const ParamsSchema = Joi.object<ParamsType>({
  unit: Joi.string().guid().required(),
}).required();

export const QuerySchema = Joi.object<QueryType>({
  statistics: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(Joi.string().valid(...statistics))
    .required(),
}).required();
