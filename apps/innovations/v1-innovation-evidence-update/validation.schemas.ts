import Joi from 'joi';

import type { CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';
import { CurrentEvidenceSchema } from '@innovations/shared/schemas/innovation-record';

export type ParamsType = {
  innovationId: string;
  evidenceId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  evidenceId: Joi.string().guid().required()
});

export type BodyType = Omit<CurrentEvidenceType, 'id'>;
export const BodySchema = CurrentEvidenceSchema.required();
