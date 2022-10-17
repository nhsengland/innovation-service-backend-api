import Joi from 'joi';

import { InnovationTransferStatusEnum } from '@innovations/shared/enums';


export type ParamsType = {
  transferId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  transferId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: InnovationTransferStatusEnum.CANCELED | InnovationTransferStatusEnum.DECLINED | InnovationTransferStatusEnum.COMPLETED
}
export const BodySchema = Joi.object<BodyType>({
  status: Joi.string().valid(InnovationTransferStatusEnum.CANCELED, InnovationTransferStatusEnum.DECLINED, InnovationTransferStatusEnum.COMPLETED).required()
}).required();
