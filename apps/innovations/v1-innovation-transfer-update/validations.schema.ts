import * as Joi from 'joi';

import { InnovationTransferStatusEnum } from '@innovations/shared/enums';


export type ParamsType = {
  transferId: string;
}

export const ParamsSchema = Joi.object<ParamsType>({
  transferId: Joi.string().guid().required()
}).required();


export type BodyType = {
  status: InnovationTransferStatusEnum;
}

export const BodySchema = Joi.object<BodyType>({
  status: Joi.string().valid(...Object.values(InnovationTransferStatusEnum)).required(),
}).required();
