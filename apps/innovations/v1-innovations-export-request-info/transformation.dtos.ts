import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  status: InnovationExportRequestStatusEnum;
  requestReason: string;
  rejectReason?: string;
  createdBy: {
    name: string;
    displayRole?: string;
    displayTeam?: string;
  };
  createdAt: Date;
  updatedBy: { name: string };
  updatedAt: Date;
};

export const ResponseBodySchema = Joi.object({
  id: Joi.string().uuid().required(),
  status: Joi.string().valid(...Object.values(InnovationExportRequestStatusEnum)),
  requestReason: Joi.string().required(),
  rejectReason: Joi.string().optional(),
  createdBy: Joi.object({
    name: Joi.string().required,
    displayRole: Joi.string().optional(),
    displayType: Joi.string().optional()
  }),
  createdAt: Joi.date().required(),
  updatedBy: Joi.object({
    name: Joi.string().required()
  }),
  updatedAt: Joi.date().required()
});
