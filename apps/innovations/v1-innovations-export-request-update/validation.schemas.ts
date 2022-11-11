import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type BodyType = {
  rejectReason: string;
  status: InnovationExportRequestStatusEnum;
}

export type PathParamsType = {
  innovationId: string;
  requestId: string;
}

export const BodySchema = Joi.object<BodyType>({
  status: Joi.when('$userType', {
    is: 'ACCESSOR',
    then: Joi.string().valid(InnovationExportRequestStatusEnum.CANCELLED).required(),
    otherwise: Joi.string().valid(InnovationExportRequestStatusEnum.REJECTED, InnovationExportRequestStatusEnum.APPROVED).required(),
  }),
  rejectReason: Joi.when('status', {
    is: InnovationExportRequestStatusEnum.REJECTED,
    then: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).required(),
    otherwise: Joi.forbidden(),
  }),
});

// accessors: Joi.when('status', {
//   is: InnovationSupportStatusEnum.ENGAGING,
//   then: Joi.array().items(Joi.object({ id: Joi.string().guid().required(), organisationUnitUserId: Joi.string().guid().required() })).required(),
//   otherwise: Joi.forbidden()
// }),

export const PathParamsSchema = Joi.object<PathParamsType>({
  innovationId: Joi.string().uuid().required(),
  requestId: Joi.string().uuid().required(),
}).required();
