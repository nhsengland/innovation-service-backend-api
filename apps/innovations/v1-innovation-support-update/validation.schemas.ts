import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
  supportId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  supportId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: Exclude<InnovationSupportStatusEnum, 'UNASSIGNED' | 'WITHDRAWN'>;
  message: string;
  accessors?: { id: string; organisationUnitUserId: string }[];
};
export const BodySchema = Joi.object<BodyType>({
  status: Joi.string()
    .valid(
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED,
      InnovationSupportStatusEnum.WAITING,
      InnovationSupportStatusEnum.NOT_YET,
      InnovationSupportStatusEnum.UNSUITABLE,
      InnovationSupportStatusEnum.COMPLETE
    )
    .required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required(),
  accessors: Joi.when('status', {
    is: InnovationSupportStatusEnum.ENGAGING,
    then: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().guid().required(),
          organisationUnitUserId: Joi.string().guid().required()
        })
      )
      .required(),
    otherwise: Joi.forbidden()
  })
}).required();
