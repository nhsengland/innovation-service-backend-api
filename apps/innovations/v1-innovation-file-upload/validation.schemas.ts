import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required().description('the innovation id'),
}).required();

export type BodyType = {
  fileName: string;
  context: null | string;
};

export const BodySchema = Joi.object<BodyType>({
  fileName: Joi.string().required().description('the file name'), // this could have a maxLength = 100 but actually removing last characters so it works without an error in frontend and no frontend changes
  context: Joi.string().max(100).default(null).description('optional context for the file'),
}).required();
