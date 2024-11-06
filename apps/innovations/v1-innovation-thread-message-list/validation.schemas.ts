import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  threadId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  threadId: JoiHelper.AppCustomJoi().string().guid().required()
});

export type QueryParamsType = {
  skip?: number;
  take?: number;
  order?: string;
};

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  skip: Joi.number().integer().min(0).default(0),
  take: Joi.number().integer().min(1).max(50).default(50),
  order: JoiHelper.AppCustomJoi().string().optional()
});
