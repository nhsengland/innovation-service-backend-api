import Joi from 'joi';

export type BodyType = {
  name: string;
  description: string;
  officeLocation: string;
  countryLocation?: string;
  postcode?: string;
  hasWebsite: string;
  website?: string;
};
export const BodySchema = Joi.object<BodyType>({
  name: Joi.required(),
  description: Joi.required(),
  officeLocation: Joi.required(),
  countryLocation: Joi.optional(),
  postcode: Joi.optional(),
  hasWebsite: Joi.required(),
  website: Joi.optional()
}).required();

export type BodySchemaAfterCalculatedFieldsType = BodyType & { countryName: string };
export const BodySchemaAfterCalculatedFieldsSchema = BodySchema.append({ countryName: Joi.required() });
