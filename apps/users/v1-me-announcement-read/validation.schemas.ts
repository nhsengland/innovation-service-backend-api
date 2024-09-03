import Joi from 'joi';

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: Joi.string().guid().required()
}).required();

export type QueryParamsType = {
  innovationId?: string;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  innovationId: Joi.string().guid()
});
