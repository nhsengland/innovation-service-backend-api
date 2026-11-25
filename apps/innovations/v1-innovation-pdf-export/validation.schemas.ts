import Joi from 'joi';
import type { DocumentExportInboundDataType } from '../_services/export-file-service';
import { DocumentExportBodySchema } from '../_services/export-file-service';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};

export type BodyType = DocumentExportInboundDataType;

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export const BodySchema = DocumentExportBodySchema;
