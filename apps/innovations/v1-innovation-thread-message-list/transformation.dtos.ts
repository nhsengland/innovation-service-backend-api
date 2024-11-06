import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  messages: {
    id: string;
    message: string;
    file?: { id: string; name: string; url: string };
    createdAt: Date;
    isNew: boolean;
    isEditable: boolean;
    createdBy: {
      id: string;
      name: string;
      role: string;
      isOwner?: boolean;
      organisation: { id: string; name: string; acronym: string | null } | undefined;
      organisationUnit: { id: string; name: string; acronym: string | null } | undefined;
    };
    updatedAt: Date;
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  messages: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      message: Joi.string().required(),
      file: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        url: Joi.string().required()
      }).optional(),
      createdAt: Joi.date().required(),
      isNew: Joi.boolean().required(),
      isEditable: Joi.boolean().required(),
      createdBy: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        role: Joi.string().required(),
        isOwner: Joi.boolean().required(),
        organisation: Joi.object({
          id: Joi.string().uuid().required(),
          name: Joi.string().required(),
          acronym: Joi.string().allow(null).required()
        }).optional(),
        organisationUnit: Joi.object({
          id: Joi.string().uuid().required(),
          name: Joi.string().required(),
          acronym: Joi.string().allow(null).required()
        }).optional()
      }),
      updatedAt: Joi.date().required()
    })
  )
});
