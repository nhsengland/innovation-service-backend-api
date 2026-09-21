import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';
import type { SurveyAnswersType } from '@innovations/shared/entities/innovation/innovation-survey.entity';
import { YesOrNoCatalogueType } from '@innovations/shared/enums';
import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

export type ParamsType = { innovationId: string; surveyId: string };
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  surveyId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

const validScale = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

export type BodyType = SurveyAnswersType;
export const BodySchema = Joi.object<BodyType>({
  supportSatisfaction: JoiHelper.AppCustomJoi()
    .string()
    .valid(...validScale)
    .required(),
  ideaOnHowToProceed: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesOrNoCatalogueType)
    .required(),
  howLikelyWouldYouRecommendIS: JoiHelper.AppCustomJoi()
    .string()
    .valid(...validScale)
    .required(),
  comment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).allow(null).optional()
}).required();
