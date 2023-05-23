import Joi from 'joi';

import { CurrentEvidenceSchema, CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required().description('The innovation id.')
});

export type BodyType = CurrentEvidenceType;
export const BodySchema = CurrentEvidenceSchema.required();
