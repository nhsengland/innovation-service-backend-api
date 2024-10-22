import type { AnnouncementParamsType } from '@admin/shared/enums';
import { AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper } from '@admin/shared/helpers';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';
import Joi from 'joi';

export const AnnouncementJoiLinkValidation = Joi.object({
  label: JoiHelper.AppCustomJoi().string(),
  url: JoiHelper.AppCustomJoi().string().uri()
});

// Announcement Schema for regular announcements and scheduled status
export type AnnouncementBodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType;
  startsAt: Date;
  expiresAt?: Date;
  type: AnnouncementTypeEnum;
  filters?: FilterPayload[];
  sendEmail: boolean;
};
export const AnnouncementBodySchema = Joi.object<AnnouncementBodyType>({
  title: JoiHelper.AppCustomJoi().string().max(100).required().description('Title of the announcement'),
  userRoles: Joi.array()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(ServiceRoleEnum).filter(t => t !== ServiceRoleEnum.ADMIN))
        .required()
        .description('User roles that will see the announcement.')
    )
    .min(1),

  params: Joi.object<AnnouncementBodyType['params']>({
    content: JoiHelper.AppCustomJoi().string().required(),
    link: AnnouncementJoiLinkValidation.optional()
  }),
  startsAt: Joi.date().required(),
  expiresAt: Joi.date().greater(Joi.ref('startsAt')).optional(),
  type: JoiHelper.AppCustomJoi()
    .string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .required(),
  filters: Joi.array()
    .items(
      Joi.object<FilterPayload>({
        section: JoiHelper.AppCustomJoi().string().required(),
        question: JoiHelper.AppCustomJoi().string().required(),
        answers: Joi.array().items(JoiHelper.AppCustomJoi().string()).min(1).required()
      })
    )
    .optional(),
  sendEmail: Joi.boolean().default(false)
}).required();

// Announcement Schema for active status
export type AnnouncementActiveBodyType = {
  expiresAt?: Date;
};
export const AnnouncementActiveBodySchema = Joi.object<AnnouncementActiveBodyType>({
  expiresAt: Joi.date().greater(Joi.ref('$startsAt')).default(null).optional()
}).required();
