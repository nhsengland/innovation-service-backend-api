import Joi from 'joi';

export type ResponseDTO = {
  id: string | undefined;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().optional()
});
