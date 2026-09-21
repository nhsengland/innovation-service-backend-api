import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  message: string;
  createdAt: Date;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  message: Joi.string().required(),
  createdAt: Joi.date().required()
});
