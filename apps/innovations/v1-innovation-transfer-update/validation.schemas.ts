import Joi from 'joi';

import { InnovationTransferStatusEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  transferId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  transferId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  status:
    | InnovationTransferStatusEnum.CANCELED
    | InnovationTransferStatusEnum.DECLINED
    | InnovationTransferStatusEnum.COMPLETED;
};
export const BodySchema = Joi.object<BodyType>({
  status: JoiHelper.AppCustomJoi()
    .string()
    .valid(
      InnovationTransferStatusEnum.CANCELED,
      InnovationTransferStatusEnum.DECLINED,
      InnovationTransferStatusEnum.COMPLETED
    )
    .required()
}).required();
