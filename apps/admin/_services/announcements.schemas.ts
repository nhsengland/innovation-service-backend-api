import { AnnouncementParamsType, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';
import Joi from 'joi';

export const AnnouncementJoiLinkValidation = Joi.object({
  label: Joi.string(),
  url: Joi.string().uri()
});

// Announcement Schema for regular announcements and scheduled status
export type AnnouncementBodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType;
  startsAt: Date;
  expiresAt?: Date;
  type: AnnouncementTypeEnum;
};
export const AnnouncementBodySchema = Joi.object<AnnouncementBodyType>({
  title: Joi.string().max(100).required().description('Title of the announcement'),
  userRoles: Joi.array()
    .items(
      Joi.string()
        .valid(...Object.values(ServiceRoleEnum).filter(t => t !== ServiceRoleEnum.ADMIN))
        .required()
        .description('User roles that will see the announcement.')
    )
    .min(1),

  params: Joi.object<AnnouncementBodyType['params']>({
    content: Joi.string().required(),
    link: AnnouncementJoiLinkValidation.optional(),
    filters: Joi.array()
      .items(
        Joi.object<FilterPayload>({
          section: Joi.string().required(),
          question: Joi.string().required(),
          answers: Joi.array().items(Joi.string()).min(1).required()
        })
      )
      .optional()
  }),
  startsAt: Joi.date().required(),
  expiresAt: Joi.date().greater(Joi.ref('startsAt')).optional(),
  type: Joi.string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .required()
}).required();

// Announcement Schema for active status
export type AnnouncementActiveBodyType = {
  expiresAt?: Date;
};
export const AnnouncementActiveBodySchema = Joi.object<AnnouncementActiveBodyType>({
  expiresAt: Joi.date().greater(Joi.ref('$startsAt')).default(null).optional()
}).required();
