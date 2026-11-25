import Joi from 'joi';

export type ResponseDTO = {
  success: boolean;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  success: Joi.boolean().required()
});
