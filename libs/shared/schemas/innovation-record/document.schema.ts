import Joi from 'joi';
import { TEXTAREA_LENGTH_LIMIT } from '../../constants/constants.config';
import { catalogEvidenceSubmitType, catalogEvidenceType } from './catalog.types';

export type DocumentValidationSchemaMap = {
  [k in keyof Omit<any, 'version'>]: Joi.Schema<any[k]>;
};

export const EvidenceSchema = Joi.object<NonNullable<any['evidences']>[number]>({
  evidenceSubmitType: Joi.string()
    .valid(...catalogEvidenceSubmitType)
    .required(),
  evidenceType: Joi.string().valid(...catalogEvidenceType),
  description: Joi.string().max(50),
  summary: Joi.string().max(TEXTAREA_LENGTH_LIMIT.m).required()
});
