import { TermsOfUseTypeEnum } from '@admin/shared/enums';

import Joi from 'joi';

export type ParamsType = {
  touId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  touId: Joi.string().guid().required().description('The terms of use id.')
}).required();

export type BodyType = {
  name: string;
  touType: TermsOfUseTypeEnum;
  summary?: string;
  releasedAt?: Date;
};
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().required().description('Name of the terms of use.'),
  touType: Joi.string()
    .valid(...Object.values(TermsOfUseTypeEnum))
    .required()
    .description('Type of the terms of use.'),
  summary: Joi.string().optional().description('Brief summary of the terms of use.'),
  releasedAt: Joi.string().optional().description('Relase date of the terms of use.')
}).required();
