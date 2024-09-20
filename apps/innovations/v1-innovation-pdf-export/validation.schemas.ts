import Joi from 'joi';
import type { DocumentExportInboundDataType } from '../_services/export-file-service';
import { DocumentExportBodySchema } from '../_services/export-file-service';

export type ParamsType = {
  innovationId: string;
};

export type BodyType = DocumentExportInboundDataType;

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export const BodySchema = DocumentExportBodySchema;
