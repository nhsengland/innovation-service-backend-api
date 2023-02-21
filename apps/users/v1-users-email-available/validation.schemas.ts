import Joi from 'joi';

import { JoiHelper } from '@users/shared/helpers';

export type QueryParamsType = {
  email: string;
}

export const QueryParamsSchema = Joi.object<QueryParamsType>({
    email: JoiHelper.AppCustomJoi().decodeURIString().email().lowercase().required().description('Email of a user.'),
}).required();

