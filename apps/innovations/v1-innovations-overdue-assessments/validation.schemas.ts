import Joi from 'joi';

import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';


export type QueryParamsType = {
  status: (InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT)[]
}

export const QueryParamsSchema = Joi.object({
  status: JoiHelper.AppCustomJoi().stringArray()
    .items(Joi.string().valid(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT))
    .required()
}).required();
