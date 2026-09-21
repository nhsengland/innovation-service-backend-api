import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  organisationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: JoiHelper.AppCustomJoi().string().uuid().required()
}).required();
