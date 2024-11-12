import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  acronym: string;
  isActive: boolean;
  canActivate: boolean;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  acronym: Joi.string().required(),
  isActive: Joi.boolean().required(),
  canActivate: Joi.boolean().required()
});
