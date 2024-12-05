import type { AnnouncementParamsType } from '@users/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  title: string;
  startsAt: Date;
  expiresAt: null | Date;
  params: null | AnnouncementParamsType;
  innovations?: string[];
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    title: Joi.string().required(),
    startsAt: Joi.date().required(),
    expiresAt: Joi.date().allow(null),
    params: Joi.object<AnnouncementParamsType>({
      content: Joi.string().required(),
      link: Joi.object({
        label: Joi.string().required(),
        url: Joi.string().required()
      }).optional()
    }).allow(null)
  })
);
