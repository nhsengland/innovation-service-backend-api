import Joi from 'joi';

export type QueryParamsType = {
  forceRefresh?: boolean;
};

export const QueryParamsSchema = Joi.object({
  forceRefresh: Joi.boolean().optional()
});
