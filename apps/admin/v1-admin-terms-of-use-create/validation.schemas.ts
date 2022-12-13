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
  name: Joi.string().required(),
  touType: Joi.string().valid(...Object.values(TermsOfUseTypeEnum)).required(),
  summary: Joi.string().optional(),
  releasedAt: Joi.string().optional()
}).required()

