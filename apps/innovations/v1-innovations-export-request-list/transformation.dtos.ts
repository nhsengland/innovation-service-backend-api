import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    status: InnovationExportRequestStatusEnum;
    createdBy: {
      name: string;
      displayRole?: string;
      displayTeam?: string;
    };
    createdAt: Date;
  }[];
};

export const ResponseBodySchema = Joi.array().items(
  Joi.object({
    count: Joi.number().integer().required(),
    data: Joi.object({
      id: Joi.string().uuid().required(),
      status: Joi.string().valid(...Object.values(InnovationExportRequestStatusEnum)),
      createdBy: Joi.object({
        name: Joi.string().required(),
        displayRole: Joi.string().optional(),
        displayTeam: Joi.string().optional()
      }),
      createdAt: Joi.date().required()
    })
  })
);
