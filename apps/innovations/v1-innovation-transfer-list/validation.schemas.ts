import * as Joi from 'joi';


export type QueryParamsType = {
  assignedToMe?: boolean;
}

export const QueryParamsSchema = Joi.object({
  assignedToMe: Joi.boolean().optional().default(false)
});
