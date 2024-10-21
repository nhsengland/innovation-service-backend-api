import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = {
  innovationId?: string;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid()
});
