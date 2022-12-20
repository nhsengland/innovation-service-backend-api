import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  assessmentId: Joi.string().guid().required().description('Id of the assessment.')
}).required();


export type BodyType = {
  assessorId: string
};
export const BodySchema = Joi.object<BodyType>({
  assessorId: Joi.string().guid().required().description('Id of the new assessor to assign.')
}).required();