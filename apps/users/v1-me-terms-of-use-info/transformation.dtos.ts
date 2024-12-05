import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  summary: string;
  releasedAt: null | Date;
  isAccepted: boolean;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  summary: Joi.string().required(),
  releasedAt: Joi.date().required(),
  isAccepted: Joi.boolean().required()
});
