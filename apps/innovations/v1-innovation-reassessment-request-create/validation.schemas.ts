import { ServiceRoleEnum } from '@users/shared/enums';
import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { YesOrNoCatalogueType } from '@innovations/shared/enums';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  updatedInnovationRecord?: YesOrNoCatalogueType;
  description: string;
};

export const BodySchema = Joi.object<BodyType>().when('$userRole', [
  {
    is: ServiceRoleEnum.INNOVATOR,
    then: Joi.object({
      updatedInnovationRecord: Joi.string()
        .valid(...Object.values(YesOrNoCatalogueType))
        .required(),
      description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
    }).required()
  },
  {
    is: ServiceRoleEnum.ASSESSMENT,
    then: Joi.object({
      updatedInnovationRecord: Joi.forbidden(),
      description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
    }).required()
  }
]);
