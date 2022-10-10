
import { model, Model, models, Schema } from 'mongoose';
import type { HasBenefitsCatalogueEnum, HasEvidenceCatalogueEnum, HasMarketResearchCatalogueEnum, HasProblemTackleKnowledgeCatalogueEnum, HasTestsCatalogueEnum, InnovationCategoryCatalogueEnum, InnovationSupportTypeCatalogueEnum, MainPurposeCatalogueEnum } from '../enums/catalog.enums';

type SurveyInfo = {
  mainCategory: MainPurposeCatalogueEnum | null | undefined;
  otherMainCategoryDescription: string;
  hasProblemTackleKnowledge: HasProblemTackleKnowledgeCatalogueEnum;
  hasMarketResearch: HasMarketResearchCatalogueEnum;
  hasBenefits: HasBenefitsCatalogueEnum;
  hasTests: HasTestsCatalogueEnum;
  hasEvidence: HasEvidenceCatalogueEnum;
  otherCategoryDescription: string;
  categories: InnovationCategoryCatalogueEnum[];
  supportTypes: InnovationSupportTypeCatalogueEnum[];
};

type SurveySchemaType = {
  id: string;
  answers: SurveyInfo;
  createdAt: string;
  updatedAt: string;
};


const SurveySchema = new Schema<SurveySchemaType>(
  {
    id: Schema.Types.ObjectId,
    answers: new Schema<SurveyInfo>(),
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SurveyModel: Model<SurveySchemaType> = models['SurveyModel'] || model<SurveySchemaType>('Survey', SurveySchema);
