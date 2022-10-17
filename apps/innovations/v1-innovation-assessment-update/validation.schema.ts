import * as Joi from 'joi';

import { MaturityLevelCatalogueEnum, YesPartiallyNoCatalogueEnum } from '@innovations/shared/enums';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';

import type { InnovationAssessmentType } from '../_types/innovation.types';


export type ParamsType = {
  innovationId: string;
  assessmentId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  assessmentId: Joi.string().guid().required()
}).required();


export type BodyType = Omit<InnovationAssessmentType, 'id'> & { suggestedOrganisationUnitsIds?: string[], isSubmission: boolean }
export const BodySchema = Joi.object<BodyType>({

  summary: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).optional(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).optional(),

  maturityLevel: Joi.string().valid(...Object.values(MaturityLevelCatalogueEnum)).optional(),
  maturityLevelComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasRegulatoryApprovals: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasRegulatoryApprovalsComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasEvidence: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasEvidenceComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasValidation: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasValidationComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasProposition: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasPropositionComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasCompetitionKnowledge: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasCompetitionKnowledgeComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasImplementationPlan: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasImplementationPlanComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  hasScaleResource: Joi.string().valid(...Object.values(YesPartiallyNoCatalogueEnum)).optional(),
  hasScaleResourceComment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.small).allow(null).optional(),

  suggestedOrganisationUnitsIds: Joi.array().items(Joi.string().guid()).optional(),
  isSubmission: Joi.boolean().strict().optional().default(false)

}).required();
