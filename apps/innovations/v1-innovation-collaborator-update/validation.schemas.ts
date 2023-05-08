import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import type { TypeFromArray } from '@innovations/shared/types';
import Joi from 'joi';

const status = [
  InnovationCollaboratorStatusEnum.ACTIVE,
  InnovationCollaboratorStatusEnum.CANCELLED,
  InnovationCollaboratorStatusEnum.DECLINED,
  InnovationCollaboratorStatusEnum.LEFT,
  InnovationCollaboratorStatusEnum.REMOVED
] as const;

export type ParamsType = {
  innovationId: string;
  collaboratorId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  collaboratorId: Joi.string().guid().required()
}).required();

export type BodyType = {
  status?: TypeFromArray<typeof status>;
  role?: string;
};
export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$collaboratorType', {
    is: 'OWNER',
    then: Joi.string()
      .valid(InnovationCollaboratorStatusEnum.CANCELLED, InnovationCollaboratorStatusEnum.REMOVED)
      .optional()
  }).when('$collaboratorType', {
    is: 'COLLABORATOR',
    then: Joi.string()
      .valid(
        InnovationCollaboratorStatusEnum.ACTIVE,
        InnovationCollaboratorStatusEnum.DECLINED,
        InnovationCollaboratorStatusEnum.LEFT
      )
      .optional()
  }),
  role: Joi.when('$collaboratorType', {
    is: 'OWNER',
    then: Joi.string().max(25).allow(null).optional(),
    otherwise: Joi.forbidden()
  })
}).required();
