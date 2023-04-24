
import { model, Model, models, Schema, Types } from 'mongoose';

import { } from './innovation-record';
import { catalogCategory, catalogsupportTypes, catalogYesInProgressNotYet, catalogYesNotYetNotSure } from './innovation-record/202209/catalog.types';

export type SurveyAnswersType = {
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
      categories: Array<catalogCategory>,
      otherCategoryDescription: { type: String, allowNull: true },
      mainCategory: { type: String, enum: catalogCategory },
      otherMainCategoryDescription: { type: String, allowNull: true },
      hasProblemTackleKnowledge: { type: String, enum: catalogYesNotYetNotSure },
      hasMarketResearch: { type: String, enum: catalogYesInProgressNotYet },
      hasWhoBenefitsKnowledge: { type: String, enum: catalogYesNotYetNotSure },
      hasBenefits: { type: String, enum: catalogYesNotYetNotSure },
      hasTests: { type: String, enum: catalogYesInProgressNotYet },
      hasRelevantCertifications: { type: String, enum: ['YES', 'NOT_YET', 'NO_KNOWLEDGE', 'NOT_APPLICABLE'] },
      hasEvidence: { type: String, enum: catalogYesInProgressNotYet },
      hasCostEvidence: { type: String, enum: ['YES', 'IN_PROGRESS', 'NOT_YET'] },
      supportTypes: Array<catalogsupportTypes>
    })
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SurveyModel: Model<SurveySchemaType> = models['Survey'] || model<SurveySchemaType>('Survey', SurveySchema);
