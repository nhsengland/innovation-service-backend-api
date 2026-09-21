import Joi from 'joi';

import { InnovationArchiveReasonEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  reason: InnovationArchiveReasonEnum;
};
export const BodySchema = Joi.object<BodyType>({
  reason: Joi.string()
    .valid(
      InnovationArchiveReasonEnum.DEVELOP_FURTHER,
      InnovationArchiveReasonEnum.HAVE_ALL_SUPPORT,
      InnovationArchiveReasonEnum.DECIDED_NOT_TO_PURSUE,
      InnovationArchiveReasonEnum.ALREADY_LIVE_NHS,
      InnovationArchiveReasonEnum.OTHER_DONT_WANT_TO_SAY
    )
    .required()
}).required();
