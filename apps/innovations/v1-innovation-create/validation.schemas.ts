import Joi from 'joi';

export type BodyType = {
  name: string;
  description: string;
  officeLocation: string;
  countryLocation?: string;
  postcode?: string;
  hasWebsite: string;
  website?: string;
  hasVideoDemonstration?: string;
  videoDemonstrationUrl?: string;
};
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().required(),
  description: Joi.string().required(),
  officeLocation: Joi.string().required(),
  countryLocation: Joi.string().optional(),
  postcode: Joi.string().optional(),
  hasWebsite: Joi.string().required(),
  website: Joi.string().optional(),
  hasVideoDemonstration: Joi.string().optional(),
  videoDemonstrationUrl: Joi.string().optional()
}).required();

export type BodySchemaAfterCalculatedFieldsType = BodyType & { countryName: string };
export const BodySchemaAfterCalculatedFieldsSchema = BodySchema.append({ countryName: Joi.required() });
