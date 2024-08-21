import { AnnouncementTypeEnum } from './../.symlinks/shared/enums/announcement.enums';
import Joi from 'joi';

export type QueryParamsType = {
  filters: {
    type?: AnnouncementTypeEnum[];
  };
};

export const QueryParamsSchema = Joi.object<QueryParamsType>({
  filters: Joi.object({
    type: Joi.array()
      .items(Joi.string().valid(...Object.values(AnnouncementTypeEnum)))
      .optional()
  }).required()
}).required();
