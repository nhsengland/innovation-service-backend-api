import Joi from 'joi';
import { ReassessmentReasons, type ReassessmentType } from '../_types/innovation.types';

export type ResponseDTO = {
  id: string;
  majorVersion: number;
  minorVersion: number;
  editReason: null | string;
  previousAssessment?: { id: string; majorVersion: number; minorVersion: number };
  reassessment?: ReassessmentType & { sectionsUpdatedSinceLastAssessment: string[] };
  summary: null | string;
  description: null | string;
  startedAt: null | Date;
  finishedAt: null | Date;
  assignTo?: { id: string; name: string };
  maturityLevel: null | string;
  maturityLevelComment: null | string;
  hasRegulatoryApprovals: null | string;
  hasRegulatoryApprovalsComment: null | string;
  hasEvidence: null | string;
  hasEvidenceComment: null | string;
  hasValidation: null | string;
  hasValidationComment: null | string;
  hasProposition: null | string;
  hasPropositionComment: null | string;
  hasCompetitionKnowledge: null | string;
  hasCompetitionKnowledgeComment: null | string;
  hasImplementationPlan: null | string;
  hasImplementationPlanComment: null | string;
  hasScaleResource: null | string;
  hasScaleResourceComment: null | string;
  suggestedOrganisations: {
    id: string;
    name: string;
    acronym: null | string;
    units: { id: string; name: string; acronym: string }[];
  }[];
  updatedAt: null | Date;
  updatedBy: { id: string; name: string };
  isLatest: boolean;
};

export const ResponseBodySchema = Joi.object({
  id: Joi.string().uuid().required(),
  majorVersion: Joi.number().integer().required(),
  minorVersion: Joi.number().integer().required(),
  editReason: Joi.string().allow(null),
  previousAssessment: Joi.object({
    id: Joi.string().uuid().required(),
    majorVersion: Joi.number().integer().required(),
    minorVersion: Joi.number().integer().required()
  }).optional(),
  reassessment: Joi.object({
    reassessmentReason: Joi.array()
      .items(Joi.string().valid(...ReassessmentReasons))
      .allow(null)
      .required(),
    otherReassessmentReason: Joi.string().required(),
    description: Joi.string().required(),
    whatSupportDoYouNeed: Joi.string().allow(null).required(),
    sectionsUpdatedSinceLastAssessment: Joi.array().items(Joi.string()).required()
  }).optional(),
  summary: Joi.string().allow(null).required(),
  description: Joi.string().allow(null).required(),
  startedAt: Joi.date().allow(null).required(),
  finishedAt: Joi.date().allow(null).required(),
  assignTo: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required()
  }).optional(),
  maturityLevel: Joi.string().allow(null).required(),
  maturityLevelComment: Joi.string().allow(null).required(),
  hasRegulatoryApprovals: Joi.string().allow(null).required(),
  hasRegulatoryApprovalsComment: Joi.string().allow(null).required(),
  hasEvidence: Joi.string().allow(null).required(),
  hasEvidenceComment: Joi.string().allow(null).required(),
  hasValidation: Joi.string().allow(null).required(),
  hasValidationComment: Joi.string().allow(null).required(),
  hasProposition: Joi.string().allow(null).required(),
  hasPropositionComment: Joi.string().allow(null).required(),
  hasCompetitionKnowledge: Joi.string().allow(null).required(),
  hasCompetitionKnowledgeComment: Joi.string().allow(null).required(),
  hasImplementationPlan: Joi.string().allow(null).required(),
  hasImplementationPlanComment: Joi.string().allow(null).required(),
  hasScaleResource: Joi.string().allow(null).required(),
  hasScaleResourceComment: Joi.string().allow(null).required(),
  suggestedOrganisations: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    acronym: Joi.string().allow(null).required(),
    units: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().uuid().required(),
          name: Joi.string().required(),
          acronym: Joi.string().required()
        })
      )
      .required()
  }).required(),
  updatedAt: Joi.date().allow(null).required(),
  updatedBy: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required()
  }).required(),
  isLatest: Joi.boolean().required()
});
