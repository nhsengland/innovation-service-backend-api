import Joi from 'joi';
import type { InnovationSuggestionsType } from '../_types/innovation.types';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
  majorAssessmentId?: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  majorAssessmentId: string;
};

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  majorAssessmentId: JoiHelper.AppCustomJoi().string().guid()
});

export type BodyType = InnovationSuggestionsType;
