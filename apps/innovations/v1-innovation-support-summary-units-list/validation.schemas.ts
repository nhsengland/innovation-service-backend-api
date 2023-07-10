import Joi from 'joi';

const SupportSummaryListType = ['ENGAGING', 'BEEN_ENGAGED', 'SUGGESTED'] as const;

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  type: (typeof SupportSummaryListType)[number];
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  type: Joi.string()
    .valid(...SupportSummaryListType)
    .required()
}).required();
