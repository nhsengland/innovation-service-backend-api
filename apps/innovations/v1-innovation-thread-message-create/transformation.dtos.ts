import Joi from 'joi';

export type ResponseDTO = {
  threadMessage: {
    createdBy: {
      id: string;
      identityId: string;
    };
    id: string;
    message: string;
    isEditable: boolean;
    createdAt: Date;
  };
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  threadMessage: Joi.object({
    createdBy: Joi.object({
      id: Joi.string().uuid().required(),
      identityId: Joi.string().required()
    }),
    id: Joi.string().uuid().required(),
    message: Joi.string().required(),
    isEditable: Joi.boolean().required(),
    createdAt: Joi.date().required()
  }).required()
});
