import Joi from 'joi';

export type ResponseDTO = {
  affected: number;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  affected: Joi.number().integer().description('The number of affected notifications').required()
});
