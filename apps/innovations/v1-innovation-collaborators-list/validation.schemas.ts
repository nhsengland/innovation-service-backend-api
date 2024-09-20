import Joi from 'joi';

import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';

enum orderFields {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  invitedAt = 'invitedAt',
  status = 'status'
}

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  status?: InnovationCollaboratorStatusEnum[];
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({
    status: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...Object.values(InnovationCollaboratorStatusEnum)))
      .optional()
  })
  .required();
