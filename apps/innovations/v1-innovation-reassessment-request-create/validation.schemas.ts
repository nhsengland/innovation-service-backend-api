import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { ServiceRoleEnum, YesOrNoCatalogueType } from '@innovations/shared/enums';

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

export const BodySchema = Joi.object<BodyType>({
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
}).when('$userRole', [
  {
    is: ServiceRoleEnum.INNOVATOR,
    then: Joi.object({
      updatedInnovationRecord: Joi.string()
        .valid(...Object.values(YesOrNoCatalogueType))
        .required()
    }).required()
  }
]);
