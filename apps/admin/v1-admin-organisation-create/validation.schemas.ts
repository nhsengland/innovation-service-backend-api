import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';
import { JoiHelper } from '@admin/shared/helpers';

export type BodyType = {
  name: string;
  acronym: string;
  units?: { name: string; acronym: string }[];
};
export const BodySchema = Joi.object<BodyType>({
  name: JoiHelper.AppCustomJoi()
    .string()
    .max(ORGANISATIONS_LENGTH_LIMITS.name)
    .required()
    .description('Name of the organisation.'),
  acronym: JoiHelper.AppCustomJoi()
    .string()
    .max(ORGANISATIONS_LENGTH_LIMITS.acronym)
    .required()
    .description('Acronym of the organisation.'),
  units: Joi.array()
    .items(
      Joi.object({
        name: JoiHelper.AppCustomJoi().string().required().description('Name of the organisation unit.'),
        acronym: JoiHelper.AppCustomJoi().string().required().description('Acronym of the organisation unit.')
      })
    )
    .optional()
    .description('Organisation units to create.')
}).required();
