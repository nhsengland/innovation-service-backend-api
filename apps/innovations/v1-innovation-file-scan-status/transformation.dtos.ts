import { FILE_SCAN_STATES, type FileDownloadAccess } from "@innovations/shared/services";
import Joi from "joi";

export type ResponseDTO = { id: string; retryAfterSeconds?: number } & FileDownloadAccess;

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  scanState: Joi.string()
    .valid(...FILE_SCAN_STATES)
    .required(),
  canDownload: Joi.boolean().required(),
  retryAfterSeconds: Joi.number().integer().positive().optional(),
  url: Joi.when("canDownload", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  })
});
