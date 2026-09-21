import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  email: string;
  innovation: {
    id: string;
    name: string;
    owner: { name: string };
  };
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  email: Joi.string().required(),
  innovation: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    owner: Joi.object({
      name: Joi.string().required()
    }).required()
  }).required()
});
