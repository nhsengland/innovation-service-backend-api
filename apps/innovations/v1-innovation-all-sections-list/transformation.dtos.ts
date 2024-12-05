import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  section: {
    section: string;
    status: InnovationSectionStatusEnum;
    submittedAt?: Date;
    submittedBy?: { name: string; displayTag: string };
    openTasksCount: number;
  };
  data: Record<string, any>;
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    section: Joi.object({
      section: Joi.string().required(),
      status: Joi.string().valid(...Object.values(InnovationSectionStatusEnum)),
      submittedAt: Joi.date().optional(),
      submittedBy: Joi.object({
        name: Joi.string().required(),
        displayTag: Joi.string().required()
      }).optional(),
      openTasksCount: Joi.number().integer().required()
    }),
    data: Joi.object().pattern(Joi.string(), Joi.any)
  })
);
