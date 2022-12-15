import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import type { DateISOType } from '@admin/shared/types';
import Joi from 'joi';

export type BodyType = {
  name: string,
  touType: TermsOfUseTypeEnum,
  summary?: string,
  releasedAt?: DateISOType
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().required().description('Name of the terms of use.'),
  touType: Joi.string().valid(...Object.values(TermsOfUseTypeEnum)).required().description('Type of the terms of use.'),
  summary: Joi.string().optional().description('Brief summary of the terms of use.'),
  releasedAt: Joi.string().optional().description('Relase date of the terms of use.')
}).required()

