import Joi from 'joi';
import { TEXTAREA_LENGTH_LIMIT } from '../../constants/constants.config';
import { catalogEvidenceSubmitType, catalogEvidenceType } from './catalog.types';
import { JoiHelper } from '../../helpers/joi.helper';

export type DocumentValidationSchemaMap = {
  [k in keyof Omit<any, 'version'>]: Joi.Schema<any[k]>;
};

export const EvidenceSchema = Joi.object<NonNullable<any['evidences']>[number]>({
  evidenceSubmitType: JoiHelper.AppCustomJoi()
    .string()
    .valid(...catalogEvidenceSubmitType)
    .required(),
  evidenceType: JoiHelper.AppCustomJoi()
    .string()
    .valid(...catalogEvidenceType),
  description: JoiHelper.AppCustomJoi().string().max(50),
  summary: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.m).required()
});
