import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  availableStatus: InnovationSupportStatusEnum[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  availableStatus: Joi.array().items(Joi.string().valid(...Object.values(InnovationSupportStatusEnum)))
});
