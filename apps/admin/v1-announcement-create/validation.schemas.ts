import Joi from 'joi';

import { AnnouncementParamsType, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

export type BodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType['GENERIC'];
  startsAt: Date;
  expiresAt?: Date;
  type?: AnnouncementTypeEnum;
  filters?: FilterPayload[];
};

export const BodySchema = Joi.object<BodyType>({
  title: Joi.string().max(100).required().description('Title of the announcement'),

  userRoles: Joi.array()
    .items(
      Joi.string()
        .valid(...Object.values(ServiceRoleEnum).filter(t => t !== ServiceRoleEnum.ADMIN))
        .required()
        .description('User roles that will see the announcement.')
    )
    .min(1),

  params: Joi.object<BodyType['params']>({
    inset: Joi.object<BodyType['params']['inset']>({
      title: Joi.string().optional(),
      content: Joi.string().optional(),
      link: Joi.object({
        label: Joi.string(),
        url: Joi.string()
      }).optional()
    }).optional(),
    content: Joi.string().optional(),
    actionLink: Joi.object<BodyType['params']['actionLink']>({
      label: Joi.string(),
      url: Joi.string()
    }).optional()
  }),

  startsAt: Joi.date().required(),
  expiresAt: Joi.date().greater(Joi.ref('startsAt')).optional(),
  type: Joi.string().optional(),
  filters: Joi.array()
    .items(
      Joi.object<FilterPayload>({
        section: Joi.string().required(),
        question: Joi.string().required(),
        answers: Joi.array().items(Joi.string()).min(1).required()
      })
    )
    .optional()
}).required();
