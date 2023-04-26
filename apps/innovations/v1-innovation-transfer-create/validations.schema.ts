import Joi from 'joi';

export type BodyType = {
  innovationId: string;
  email: string;
  ownerToCollaborator: boolean;
};
export const BodySchema = Joi.object<BodyType>({
  email: Joi.string().email().required(),
  innovationId: Joi.string().guid().required(),
  ownerToCollaborator: Joi.boolean().required(),
}).required();
