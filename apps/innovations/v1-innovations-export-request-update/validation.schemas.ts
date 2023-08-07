import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  requestId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().uuid().required(),
  requestId: Joi.string().uuid().required()
}).required();

export type BodyType = {
  status: InnovationExportRequestStatusEnum;
  rejectReason?: string;
};
export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$userType', [
    {
      is: 'ACCESSOR',
      then: Joi.string().valid(InnovationExportRequestStatusEnum.CANCELLED).required()
    },
    {
      is: 'ASSESSMENT',
      then: Joi.string().valid(InnovationExportRequestStatusEnum.CANCELLED).required()
    },
    {
      is: 'QUALIFYING_ACCESSOR',
      then: Joi.string().valid(InnovationExportRequestStatusEnum.CANCELLED).required(),
      otherwise: Joi.string()
        .valid(InnovationExportRequestStatusEnum.REJECTED, InnovationExportRequestStatusEnum.APPROVED)
        .required()
    }
  ]),
  rejectReason: Joi.when('status', {
    is: InnovationExportRequestStatusEnum.REJECTED,
    then: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required(),
    otherwise: Joi.forbidden()
  })
}).required();
