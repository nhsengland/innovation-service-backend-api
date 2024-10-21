import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type BodyType = {
  innovationId: string;
  email: string;
  ownerToCollaborator: boolean;
};
export const BodySchema = Joi.object<BodyType>({
  email: JoiHelper.AppCustomJoi().string().email().required(),
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  ownerToCollaborator: Joi.boolean().required()
}).required();
