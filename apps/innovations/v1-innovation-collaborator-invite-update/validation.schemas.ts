import { InnovationCollaboratorStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status: InnovationCollaboratorStatusEnum.ACTIVE | InnovationCollaboratorStatusEnum.DECLINED | InnovationCollaboratorStatusEnum.LEFT,
}
export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$userRole', {
    is: ServiceRoleEnum.INNOVATOR,
    then: Joi.string().valid(InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.DECLINED, InnovationCollaboratorStatusEnum.LEFT).required(),
    otherwise: Joi.forbidden()
  })
}).required();
