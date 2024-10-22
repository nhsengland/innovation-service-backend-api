import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  organisationId: string;
  organisationUnitId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: JoiHelper.AppCustomJoi().string().guid().required(),
  organisationUnitId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
