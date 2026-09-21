import Joi from 'joi';

import type { CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';
import { CurrentEvidenceSchema } from '@innovations/shared/schemas/innovation-record';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
  evidenceId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  evidenceId: JoiHelper.AppCustomJoi().string().guid().required()
});

export type BodyType = Omit<CurrentEvidenceType, 'id'>;
export const BodySchema = CurrentEvidenceSchema.required();
