import { FILE_SCAN_STATES, type FileDownloadAccess } from '@innovations/shared/services';
import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    context: { id?: string; type: InnovationFileContextTypeEnum; name?: string };
    name: string;
    description?: string;
    createdAt: Date;
    createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
    file: { id: string; name: string; size?: number; extension: string } & FileDownloadAccess;
  }[];
};

export const ResponseBodySchema = Joi.object({
  count: Joi.number().integer().required(),
  data: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      context: Joi.object({
        id: Joi.string().uuid().optional(),
        type: Joi.string().valid(...Object.values(InnovationFileContextTypeEnum)),
        name: Joi.string().optional()
      }).required(),
      name: Joi.string().required(),
      description: Joi.string().optional(),
      createdAt: Joi.date().required(),
      createdBy: Joi.object({
        name: Joi.string().required(),
        role: Joi.string().valid(...Object.values(ServiceRoleEnum)),
        isOwner: Joi.boolean().optional(),
        orgUnitName: Joi.string().optional()
      }).required(),
      file: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        size: Joi.number().optional(),
        extension: Joi.string().required(),
        scanState: Joi.string()
          .valid(...FILE_SCAN_STATES)
          .required(),
        canDownload: Joi.boolean().required(),
        url: Joi.when('canDownload', {
          is: true,
          then: Joi.string().required(),
          otherwise: Joi.forbidden()
        })
      })
    })
  )
});
