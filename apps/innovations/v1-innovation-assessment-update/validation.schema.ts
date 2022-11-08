import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { MaturityLevelCatalogueEnum, YesPartiallyNoCatalogueEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string,
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  assessmentId: Joi.string().guid().required()
}).required();


export type BodyType = {
  summary?: null | string,
  description?: null | string,
  maturityLevel?: null | MaturityLevelCatalogueEnum,
  maturityLevelComment?: null | string,
  hasRegulatoryApprovals?: null | YesPartiallyNoCatalogueEnum,
  hasRegulatoryApprovalsComment?: null | string,
  hasEvidence?: null | YesPartiallyNoCatalogueEnum,
  hasEvidenceComment?: null | string,
  hasValidation?: null | YesPartiallyNoCatalogueEnum,
  hasValidationComment?: null | string,
  hasProposition?: null | YesPartiallyNoCatalogueEnum,
  hasPropositionComment?: null | string,
  hasCompetitionKnowledge?: null | YesPartiallyNoCatalogueEnum,
  hasCompetitionKnowledgeComment?: null | string,
  hasImplementationPlan?: null | YesPartiallyNoCatalogueEnum,
  hasImplementationPlanComment?: null | string,
  hasScaleResource?: null | YesPartiallyNoCatalogueEnum,
  hasScaleResourceComment?: null | string,
  suggestedOrganisationUnitsIds?: string[],
  isSubmission?: boolean
};
export const BodySchema = Joi.object<BodyType>({

  summary: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).optional(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).allow(null).optional(),

  maturityLevel: Joi.string().valid(...Object.values(MaturityLevelCatalogueEnum)).allow(null).optional(),
  maturityLevelComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasRegulatoryApprovals: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasRegulatoryApprovalsComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasEvidence: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasEvidenceComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasValidation: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasValidationComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasProposition: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasPropositionComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasCompetitionKnowledge: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasCompetitionKnowledgeComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasImplementationPlan: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasImplementationPlanComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasScaleResource: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).allow(null).optional(),
  hasScaleResourceComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  suggestedOrganisationUnitsIds: Joi.array().items(Joi.string().guid()).optional(),
  isSubmission: Joi.boolean().strict().optional().default(false)

}).required();
