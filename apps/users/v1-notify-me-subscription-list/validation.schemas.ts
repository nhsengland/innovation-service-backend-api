import Joi from 'joi';

export type QueryParamsType = {
  innovationId?: string;
};
export const QueryParamsSchema = Joi.object({
  innovationId: Joi.string().guid()
});
