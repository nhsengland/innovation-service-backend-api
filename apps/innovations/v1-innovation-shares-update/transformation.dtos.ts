import Joi from 'joi';

export type ResponseDTO = {
  id: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().description('The unique identifier of the innovation.').required()
});
