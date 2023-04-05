import Joi from 'joi';

export type ParamsType = {
  announcementId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: Joi.string().guid().required(),
}).required();
