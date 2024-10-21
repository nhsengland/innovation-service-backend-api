import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type CollaboratorStatusType =
  | InnovationCollaboratorStatusEnum.ACTIVE
  | InnovationCollaboratorStatusEnum.CANCELLED
  | InnovationCollaboratorStatusEnum.DECLINED
  | InnovationCollaboratorStatusEnum.LEFT
  | InnovationCollaboratorStatusEnum.REMOVED;

export type ParamsType = {
  innovationId: string;
  collaboratorId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  collaboratorId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  status?: CollaboratorStatusType;
  role?: string;
};
export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$collaboratorType', {
    is: 'OWNER',
    then: JoiHelper.AppCustomJoi()
      .string()
      .valid(InnovationCollaboratorStatusEnum.CANCELLED, InnovationCollaboratorStatusEnum.REMOVED)
      .optional()
  }).when('$collaboratorType', {
    is: 'COLLABORATOR',
    then: JoiHelper.AppCustomJoi()
      .string()
      .valid(
        InnovationCollaboratorStatusEnum.ACTIVE,
        InnovationCollaboratorStatusEnum.DECLINED,
        InnovationCollaboratorStatusEnum.LEFT
      )
      .optional()
  }),
  role: Joi.when('$collaboratorType', {
    is: 'OWNER',
    then: JoiHelper.AppCustomJoi().string().max(25).allow(null).optional(),
    otherwise: Joi.forbidden()
  })
}).required();
