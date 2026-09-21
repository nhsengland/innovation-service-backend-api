import Joi from 'joi';
import type { SurveyInfoPayload } from '../_services/surveys.service';

export type ResponseDTO = {
  id: string;
  createdAt: Date;
  info?: SurveyInfoPayload;
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    createdAt: Joi.date().required(),
    info: Joi.object({
      type: Joi.string().required(),
      supportId: Joi.string().uuid().required(),
      supportUnit: Joi.string().required(),
      supportFinishedAt: Joi.date().required()
    }).optional()
  })
);
