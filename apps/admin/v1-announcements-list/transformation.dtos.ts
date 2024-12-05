import { AnnouncementStatusEnum, AnnouncementTypeEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    title: string;
    startsAt: Date;
    expiresAt: null | Date;
    status: AnnouncementStatusEnum;
    type: AnnouncementTypeEnum;
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  data: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      title: Joi.string().required(),
      startsAt: Joi.date().required(),
      expiresAt: Joi.date().allow(null).required(),
      status: Joi.string().valid(...Object.values(AnnouncementStatusEnum)),
      type: Joi.string().valid(...Object.values(AnnouncementTypeEnum))
    })
  )
});
