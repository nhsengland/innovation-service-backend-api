import Joi from 'joi';

export type ResponseDTO = {
  userExists: boolean;
};

export const ResponseBodySchema = Joi.object({
  userExists: Joi.boolean().required()
});
