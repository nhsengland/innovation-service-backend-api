import type{
  ClinicalEvidenceTypeCatalogueEnum,
  EvidenceTypeCatalogueEnum,
} from '@innovations/shared/enums';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
});

export type BodyType = {
  evidenceType: EvidenceTypeCatalogueEnum;
  clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum;
  description: string;
  summary: string;
  files: string[];
};
export const BodySchema = Joi.object<BodyType>({
  evidenceType: Joi.string().allow(null).allow('').required(),
  clinicalEvidenceType: Joi.string().allow(null).allow('').optional(),
  description: Joi.string().allow(null).allow('').required(),
  summary: Joi.string().max(50).allow(null).allow('').required(),
  files: Joi.array().items(Joi.string()).required(),
})
.required()
.unknown(true);
