import { DocumentType, DocumentVersions } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  version?: DocumentType['version'];
}

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  version: Joi.string().valid(...DocumentVersions)
});
