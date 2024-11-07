import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  userExists: boolean;
  collaboratorStatus: InnovationCollaboratorStatusEnum;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  userExists: Joi.boolean().required(),
  collaboratorStatus: Joi.string().valid(...Object.values(InnovationCollaboratorStatusEnum))
});
