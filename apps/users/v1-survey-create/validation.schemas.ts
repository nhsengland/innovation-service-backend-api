import { catalogCategory, catalogYesInProgressNotYet, catalogYesNotYetNotSure, catalogsupportTypes } from '@users/shared/schemas/innovation-record/202209/catalog.types';
import Joi from 'joi';

export type BodyType = {
  categories: catalogCategory[],
  otherCategoryDescription: null | string,
  mainCategory: catalogCategory,
  otherMainCategoryDescription: null | string,
  hasProblemTackleKnowledge: catalogYesNotYetNotSure,
  hasMarketResearch: catalogYesInProgressNotYet,
  hasWhoBenefitsKnowledge: catalogYesNotYetNotSure,
  hasBenefits: catalogYesNotYetNotSure,
  hasTests: catalogYesInProgressNotYet,
  hasRelevantCertifications: 'YES' | 'NOT_YET' | 'NO_KNOWLEDGE' | 'NOT_APPLICABLE',
  hasEvidence: catalogYesInProgressNotYet,
  hasCostEvidence: 'YES' | 'IN_PROGRESS' | 'NOT_YET',
  supportTypes: catalogsupportTypes[]
};

export const BodySchema = Joi.object<BodyType>({
  categories: Joi.array().items(Joi.string().valid(...catalogCategory)),
  otherCategoryDescription: Joi.string().allow(null),
  mainCategory: Joi.string().valid(...catalogCategory),
  otherMainCategoryDescription: Joi.string().allow(null),
  hasProblemTackleKnowledge: Joi.string().valid(...catalogYesNotYetNotSure),
  hasMarketResearch: Joi.string().valid(...catalogYesInProgressNotYet),
  hasWhoBenefitsKnowledge: Joi.string().valid(...catalogYesNotYetNotSure),
  hasBenefits: Joi.string().valid(...catalogYesNotYetNotSure),
  hasTests: Joi.string().valid(...catalogYesInProgressNotYet),
  hasRelevantCertifications: Joi.string().valid('YES', 'NOT_YET', 'NO_KNOWLEDGE', 'NOT_APPLICABLE'),
  hasEvidence: Joi.string().valid(...catalogYesInProgressNotYet),
  hasCostEvidence: Joi.string().valid('YES', 'IN_PROGRESS', 'NOT_YET'),
  supportTypes: Joi.array().items(Joi.string().valid(...catalogsupportTypes))
}).required();
