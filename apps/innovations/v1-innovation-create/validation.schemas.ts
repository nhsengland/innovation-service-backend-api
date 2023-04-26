import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';

export type BodyType = {
  name: string;
  description: string;
  countryName: string;
  postcode?: string;
  website?: string;
};
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(100).required().trim(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).required(),
  countryName: Joi.string().max(100).required(),
  postcode: Joi.string().max(8),
  website: Joi.string().max(100), // TODO not validating URL format atm
}).required();
