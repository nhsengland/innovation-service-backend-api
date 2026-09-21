import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { MaturityLevelCatalogueType, YesPartiallyNoCatalogueType } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  assessmentId: JoiHelper.AppCustomJoi().string().guid().required()
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
  summary: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).allow(null).optional(),
  description: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).allow(null).optional(),

  maturityLevel: JoiHelper.AppCustomJoi()
    .string()
    .valid(...MaturityLevelCatalogueType)
    .allow(null)
    .optional(),
  maturityLevelComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  hasRegulatoryApprovals: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasRegulatoryApprovalsComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  hasEvidence: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasEvidenceComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  hasValidation: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasValidationComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  hasProposition: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasPropositionComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  hasCompetitionKnowledge: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasCompetitionKnowledgeComment: JoiHelper.AppCustomJoi()
    .string()
    .max(TEXTAREA_LENGTH_LIMIT.xs)
    .allow(null)
    .optional(),

  hasImplementationPlan: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasImplementationPlanComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  hasScaleResource: JoiHelper.AppCustomJoi()
    .string()
    .valid(...YesPartiallyNoCatalogueType)
    .allow(null)
    .optional(),
  hasScaleResourceComment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xs).allow(null).optional(),

  suggestedOrganisationUnitsIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).allow(null).optional(),
  isSubmission: Joi.boolean().strict().optional().default(false)
}).required();
