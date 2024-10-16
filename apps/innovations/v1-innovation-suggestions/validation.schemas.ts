import Joi from 'joi';
import type { InnovationSuggestionsType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
  majorAssessmentId?: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  majorAssessmentId: string;
};

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  majorAssessmentId: Joi.string().guid()
});

export type BodyType = InnovationSuggestionsType;
