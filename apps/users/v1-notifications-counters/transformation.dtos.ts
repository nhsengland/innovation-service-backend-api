import Joi from 'joi';

export type ResponseDTO = {
  total: number;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  total: Joi.number().integer().description('The total of active notifications').required()
});
