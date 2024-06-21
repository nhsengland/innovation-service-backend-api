import Joi from 'joi';

export type QueryType = {
  withDetails?: boolean;
};

export const QuerySchema = Joi.object<QueryType>({
  withDetails: Joi.boolean().optional()
});
