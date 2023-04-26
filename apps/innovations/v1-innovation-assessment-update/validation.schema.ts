import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { MaturityLevelCatalogueType, YesPartiallyNoCatalogueType } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  assessmentId: Joi.string().guid().required(),
}).required();

export type BodyType = {
  summary?: null | string;
  description?: null | string;
  maturityLevel?: null | MaturityLevelCatalogueType;
  maturityLevelComment?: null | string;
  hasRegulatoryApprovals?: null | YesPartiallyNoCatalogueType;
  hasRegulatoryApprovalsComment?: null | string;
  hasEvidence?: null | YesPartiallyNoCatalogueType;
  hasEvidenceComment?: null | string;
  hasValidation?: null | YesPartiallyNoCatalogueType;
  hasValidationComment?: null | string;
  hasProposition?: null | YesPartiallyNoCatalogueType;
  hasPropositionComment?: null | string;
  hasCompetitionKnowledge?: null | YesPartiallyNoCatalogueType;
  hasCompetitionKnowledgeComment?: null | string;
  hasImplementationPlan?: null | YesPartiallyNoCatalogueType;
  hasImplementationPlanComment?: null | string;
  hasScaleResource?: null | YesPartiallyNoCatalogueType;
  hasScaleResourceComment?: null | string;
  suggestedOrganisationUnitsIds?: string[];
  isSubmission?: boolean;
};
export const BodySchema = Joi.object<BodyType>({
  summary: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null).optional(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null).optional(),

  maturityLevel: Joi.string()
    .valid(...MaturityLevelCatalogueType)
    .allow(null)
    .optional(),
  maturityLevelComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasRegulatoryApprovals: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasRegulatoryApprovalsComment: Joi.string()
    .max(TEXTAREA_LENGTH_LIMIT.small)
    .allow(null)
    .optional(),

  hasEvidence: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasEvidenceComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasValidation: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasValidationComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasProposition: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasPropositionComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasCompetitionKnowledge: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasCompetitionKnowledgeComment: Joi.string()
    .max(TEXTAREA_LENGTH_LIMIT.small)
    .allow(null)
    .optional(),

  hasImplementationPlan: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasImplementationPlanComment: Joi.string()
    .max(TEXTAREA_LENGTH_LIMIT.small)
    .allow(null)
    .optional(),

  hasScaleResource: Joi.string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasScaleResourceComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  suggestedOrganisationUnitsIds: Joi.array().items(Joi.string().guid()).allow(null).optional(),
  isSubmission: Joi.boolean().strict().optional().default(false),
}).required();
