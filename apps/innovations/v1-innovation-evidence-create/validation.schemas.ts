import type{
  ClinicalEvidenceTypeCatalogueEnum,
  EvidenceTypeCatalogueEnum,
} from '@innovations/shared/enums';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required().description('The innovation id.'),  
});

export type BodyType = {
  evidenceType: EvidenceTypeCatalogueEnum;
  clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum;
  description: string;
  summary: string;
  files: string[];
};
export const BodySchema = Joi.object<BodyType>({
  evidenceType: Joi.string().allow(null).allow('').required().description('The evidence type.'),
  clinicalEvidenceType: Joi.string().allow(null).allow('').optional().description('The clinical evidence type.'),
  description: Joi.string().allow(null).allow('').required().description('The evidence description.'),
  summary: Joi.string().max(50).allow(null).allow('').required().description('Small summary of the evidence.'),
  files: Joi.array().items(Joi.string()).required().description('Files to support the evidence.'),
}).required()
