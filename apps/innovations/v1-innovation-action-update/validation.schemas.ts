import Joi from 'joi';

import { InnovationActionStatusEnum, UserTypeEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string,
  actionId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  actionId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: InnovationActionStatusEnum,
  message?: string
}
export const BodySchema = Joi.object<BodyType>({

  status:
    Joi.when('$userType', {
      is: UserTypeEnum.ACCESSOR,
      then: Joi.string().valid(InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.COMPLETED, InnovationActionStatusEnum.CANCELLED).required()
    }).when('$userType', {
      is: UserTypeEnum.INNOVATOR,
      then: Joi.string().valid(InnovationActionStatusEnum.DECLINED).required()
    }),

  message:
    Joi.when('$userType', {
      is: UserTypeEnum.ACCESSOR,
      then: Joi.forbidden()
    }).when('$userType', {
      is: UserTypeEnum.INNOVATOR,
      then: Joi.string().max(500).required()
    })

}).required();
