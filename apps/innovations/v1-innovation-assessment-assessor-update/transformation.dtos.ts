import Joi from 'joi';

export type ResponseDTO = {
  assessmentId: string;
  assessorId: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  assessmentId: Joi.string().uuid().required(),
  assessorId: Joi.string().uuid().required()
});
