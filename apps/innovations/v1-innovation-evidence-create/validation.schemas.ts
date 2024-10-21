import Joi from 'joi';

import type { CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';
import { CurrentEvidenceSchema } from '@innovations/shared/schemas/innovation-record';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required().description('The innovation id.')
});

export type BodyType = Omit<CurrentEvidenceType, 'id'>;
export const BodySchema = CurrentEvidenceSchema.required();
