import Joi from 'joi';

import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type QueryParamsType = {
  status: (InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT)[];
  assignedToMe: boolean;
};

export const QueryParamsSchema = Joi.object({
  status: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT)
    )
    .required(),
  assignedToMe: Joi.boolean().optional().default(false)
}).required();
