import Joi from 'joi';

export type ResponseDTO = {
  id: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string()
    .uuid()
    .description('The innovation task id.')
    .example('c0a80121-7ac0-464e-b8f6-27b88b0cda7f')
    .required()
});
