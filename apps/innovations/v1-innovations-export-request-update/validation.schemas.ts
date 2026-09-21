import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  requestId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().uuid().required(),
  requestId: JoiHelper.AppCustomJoi().string().uuid().required()
}).required();

export type BodyType = {
  status: InnovationExportRequestStatusEnum;
  rejectReason?: string;
};
export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$userType', [
    {
      is: 'ACCESSOR',
      then: JoiHelper.AppCustomJoi().string().valid(InnovationExportRequestStatusEnum.CANCELLED).required()
    },
    {
      is: 'ASSESSMENT',
      then: JoiHelper.AppCustomJoi().string().valid(InnovationExportRequestStatusEnum.CANCELLED).required()
    },
    {
      is: 'QUALIFYING_ACCESSOR',
      then: JoiHelper.AppCustomJoi().string().valid(InnovationExportRequestStatusEnum.CANCELLED).required(),
      otherwise: JoiHelper.AppCustomJoi()
        .string()
        .valid(InnovationExportRequestStatusEnum.REJECTED, InnovationExportRequestStatusEnum.APPROVED)
        .required()
    }
  ]),
  rejectReason: Joi.when('status', {
    is: InnovationExportRequestStatusEnum.REJECTED,
    then: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.s).required(),
    otherwise: Joi.forbidden()
  })
}).required();
