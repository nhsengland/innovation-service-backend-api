
import { model, Model, models, Schema } from 'mongoose';

import type { HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasMarketResearchCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasTestsCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationSupportTypeCatalogueEnum, YesNotYetNotSureCatalogueEnum } from '../enums/catalog.enums';

export type SurveyAnswersType = {
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

type SurveySchemaType = {
  id: string;
  answers: SurveyAnswersType;
  createdAt: string;
  updatedAt: string;
};


const SurveySchema = new Schema<SurveySchemaType>(
  {
    id: Schema.Types.ObjectId,
    answers: new Schema<SurveyAnswersType>(),
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SurveyModel: Model<SurveySchemaType> = models['SurveyModel'] || model<SurveySchemaType>('Survey', SurveySchema);
