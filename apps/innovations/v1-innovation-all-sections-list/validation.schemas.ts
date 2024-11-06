import { JoiHelper } from '@innovations/shared/helpers';
import type { DocumentType } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  version?: DocumentType['version'];
};

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  version: Joi.number().min(0)
});
