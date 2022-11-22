
import { model, Model, models, Schema, Types } from 'mongoose';

import { HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasMarketResearchCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasTestsCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationSupportTypeCatalogueEnum, YesNotYetNotSureCatalogueEnum } from '../enums/catalog.enums';

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
  id: string,
  answers: SurveyAnswersType,
  createdAt: string,
  updatedAt: string
};


const SurveySchema = new Schema<SurveySchemaType>(
  {
    id: Types.ObjectId,
    answers: new Schema<SurveyAnswersType>({
      categories: Array<InnovationCategoryCatalogueEnum>,
      otherCategoryDescription: { type: String, allowNull: true },
      mainCategory: { type: String, enum: InnovationCategoryCatalogueEnum },
      otherMainCategoryDescription: { type: String, allowNull: true },
      hasProblemTackleKnowledge: { type: String, enum: HasProblemTackleKnowledgeCatalogueEnum },
      hasMarketResearch: { type: String, enum: HasMarketResearchCatalogueEnum },
      hasWhoBenefitsKnowledge: { type: String, enum: YesNotYetNotSureCatalogueEnum },
      hasBenefits: { type: String, enum: HasBenefitsCatalogueEnum },
      hasTests: { type: String, enum: HasTestsCatalogueEnum },
      hasRelevantCertifications: { type: String, enum: ['YES', 'NOT_YET', 'NO_KNOWLEDGE', 'NOT_APPLICABLE'] },
      hasEvidence: { type: String, enum: HasEvidenceCatalogueEnum },
      hasCostEvidence: { type: String, enum: ['YES', 'IN_PROGRESS', 'NOT_YET'] },
      supportTypes: Array<InnovationSupportTypeCatalogueEnum>
    })
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SurveyModel: Model<SurveySchemaType> = models['Survey'] || model<SurveySchemaType>('Survey', SurveySchema);
