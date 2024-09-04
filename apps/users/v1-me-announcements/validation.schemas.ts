import { AnnouncementTypeEnum } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type QueryParamsType = {
  type?: AnnouncementTypeEnum[];
  innovationId?: string;
};
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  type: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(Joi.string().valid(...Object.values(AnnouncementTypeEnum)))
    .optional(),
  innovationId: Joi.string().guid().optional()
});
