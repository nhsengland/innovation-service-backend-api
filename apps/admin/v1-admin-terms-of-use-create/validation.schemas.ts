import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import { JoiHelper } from '@admin/shared/helpers';

import Joi from 'joi';

export type BodyType = {
  name: string;
  touType: TermsOfUseTypeEnum;
  summary?: string;
  releasedAt?: Date;
};
export const BodySchema = Joi.object<BodyType>({
  name: JoiHelper.AppCustomJoi().string().required().description('Name of the terms of use.'),
  touType: JoiHelper.AppCustomJoi()
    .string()
    .valid(...Object.values(TermsOfUseTypeEnum))
    .required()
    .description('Type of the terms of use.'),
  summary: JoiHelper.AppCustomJoi().string().optional().description('Brief summary of the terms of use.'),
  releasedAt: JoiHelper.AppCustomJoi().string().optional().description('Relase date of the terms of use.')
}).required();
