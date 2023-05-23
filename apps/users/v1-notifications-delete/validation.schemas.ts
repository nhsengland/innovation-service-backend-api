import Joi from 'joi';

export type PathParamType = {
  notificationId: string;
};

export const PathParamsSchema = Joi.object<PathParamType>({
  notificationId: Joi.string().uuid().required().description('The notification ID')
}).required();
