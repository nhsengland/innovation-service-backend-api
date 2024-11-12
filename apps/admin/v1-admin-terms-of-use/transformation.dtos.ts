import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  touType: TermsOfUseTypeEnum;
  summary: string;
  releasedAt: Date | null;
  createdAt: Date;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().guid().required(),
  name: Joi.string().required(),
  touType: Joi.string().valid(Object.values(TermsOfUseTypeEnum)).required(),
  summary: Joi.string().required(),
  releasedAt: Joi.date().allow(null).required(),
  createdAt: Joi.date().required()
});
