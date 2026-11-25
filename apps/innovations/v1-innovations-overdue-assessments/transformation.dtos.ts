import Joi from 'joi';

export type ResponseDTO = {
  overdue: number;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  overdue: Joi.number().integer().required()
});
