import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: Exclude<InnovationSupportStatusEnum, 'UNASSIGNED' | 'WITHDRAWN'>;
  message: string;
  accessors?: { id: string; userRoleId: string }[];
};
export const BodySchema = Joi.object<BodyType>({
  status: Joi.string()
    .valid(
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.WAITING,
      InnovationSupportStatusEnum.UNSUITABLE
    )
    .required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required(),
  accessors: Joi.when('status', {
    is: InnovationSupportStatusEnum.ENGAGING,
    then: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().guid().required(),
          userRoleId: Joi.string().guid().required()
        })
      )
      .required(),
    otherwise: Joi.forbidden()
  })
}).required();
