import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  url: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  url: Joi.string().required()
});
