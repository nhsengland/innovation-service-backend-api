import Joi from 'joi';

export type ResponseDTO = {
  id: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().description('Message Id').required()
});
