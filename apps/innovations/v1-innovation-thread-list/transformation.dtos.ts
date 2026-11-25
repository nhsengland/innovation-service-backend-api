import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    subject: string;
    createdBy: { id: string; displayTeam?: string };
    lastMessage: {
      id: string;
      createdAt: Date;
      createdBy: { id: string; displayTeam?: string };
    };
    messageCount: number;
    hasUnreadNotifications: boolean;
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  data: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      subject: Joi.string().required(),
      createdBy: Joi.object({
        id: Joi.string().uuid().required(),
        displayTeam: Joi.string().optional()
      }),
      lastMessage: Joi.object({
        id: Joi.string().uuid().required(),
        createdAt: Joi.date().required(),
        createdBy: Joi.object({
          id: Joi.string().uuid().required(),
          displayTeam: Joi.string().optional()
        })
      }),
      messageCount: Joi.number().integer().required(),
      hasUnreadNotifications: Joi.boolean().required()
    })
  )
});
