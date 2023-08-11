import Joi from 'joi';

export type ParamsType = {
  notificationId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  notificationId: Joi.string().uuid().required().description('The notification ID')
}).required();
