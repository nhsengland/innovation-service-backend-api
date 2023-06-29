import Joi from 'joi';

import { CurrentEvidenceSchema, CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';

export type ParamsType = {
  innovationId: string;
  evidenceId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  evidenceId: Joi.string().guid().required()
});

export type BodyType = CurrentEvidenceType;
export const BodySchema = CurrentEvidenceSchema.required();
