import Joi from 'joi';

import { HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasMarketResearchCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasTestsCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationSupportTypeCatalogueEnum, YesNotYetNotSureCatalogueEnum } from '@users/shared/enums';

export type BodyType = {
  categories: InnovationCategoryCatalogueEnum[],
  otherCategoryDescription: null | string,
  mainCategory: InnovationCategoryCatalogueEnum,
  otherMainCategoryDescription: null | string,
  hasProblemTackleKnowledge: HasProblemTackleKnowledgeCatalogueEnum,
  hasMarketResearch: HasMarketResearchCatalogueEnum,
  hasWhoBenefitsKnowledge: YesNotYetNotSureCatalogueEnum,
  hasBenefits: HasBenefitsCatalogueEnum,
  hasTests: HasTestsCatalogueEnum,
  hasRelevantCertifications: 'YES' | 'NOT_YET' | 'NO_KNOWLEDGE' | 'NOT_APPLICABLE',
  hasEvidence: HasEvidenceCatalogueEnum,
  hasCostEvidence: 'YES' | 'IN_PROGRESS' | 'NOT_YET',
  supportTypes: InnovationSupportTypeCatalogueEnum[]
};

export const BodySchema = Joi.object<BodyType>({
  categories: Joi.array().items(Joi.string().valid(...Object.values(InnovationCategoryCatalogueEnum))),
  otherCategoryDescription: Joi.string().allow(null),
  mainCategory: Joi.string().valid(...Object.values(InnovationCategoryCatalogueEnum)),
  otherMainCategoryDescription: Joi.string().allow(null),
  hasProblemTackleKnowledge: Joi.string().valid(...Object.values(HasProblemTackleKnowledgeCatalogueEnum)),
  hasMarketResearch: Joi.string().valid(...Object.values(HasMarketResearchCatalogueEnum)),
  hasWhoBenefitsKnowledge: Joi.string().valid(...Object.values(YesNotYetNotSureCatalogueEnum)),
  hasBenefits: Joi.string().valid(...Object.values(HasBenefitsCatalogueEnum)),
  hasTests: Joi.string().valid(...Object.values(HasTestsCatalogueEnum)),
  hasRelevantCertifications: Joi.string().valid('YES', 'NOT_YET', 'NO_KNOWLEDGE', 'NOT_APPLICABLE'),
  hasEvidence: Joi.string().valid(...Object.values(HasEvidenceCatalogueEnum)),
  hasCostEvidence: Joi.string().valid('YES', 'IN_PROGRESS', 'NOT_YET'),
  supportTypes: Joi.array().items(Joi.string().valid(...Object.values(InnovationSupportTypeCatalogueEnum)))
}).required();
