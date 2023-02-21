import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import type { ClinicalEvidenceTypeCatalogueEnum, EvidenceTypeCatalogueEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string,
  evidenceId: string
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required().description('The innovation id.'),
  evidenceId: Joi.string().guid().required().description('The evidence id.')
});

export type BodyType = {
  evidenceType: EvidenceTypeCatalogueEnum,
  clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum,
  description: string,
  summary: string,
  files: string[]
};
export const BodySchema = Joi.object<BodyType>({
  evidenceType: Joi.string().required().description('The evidence type.'),
  clinicalEvidenceType: Joi.string().allow(null).optional().description('The clinical evidence type.'),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).required().description('The evidence description.'),
  summary: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).allow(null).required().description('Small summary of the evidence.'),
  files: Joi.array().items(Joi.string()).required().description('Files to support the evidence.')
}).required();
