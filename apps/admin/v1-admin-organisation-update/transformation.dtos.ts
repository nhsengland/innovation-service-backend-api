import Joi from 'joi';

export type ResponseDTO = {
  organisationId: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  organisationId: Joi.string().uuid().description('The organisation id.').required()
});
