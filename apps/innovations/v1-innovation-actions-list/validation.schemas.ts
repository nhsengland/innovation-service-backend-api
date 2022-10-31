import Joi from 'joi';

import { InnovationActionStatusEnum, InnovationSectionEnum } from '@innovations/shared/enums';
import { PaginationQueryParamsType, JoiHelper } from '@innovations/shared/helpers';

enum orderFields {
  displayId = 'displayId',
  section = 'section',
  innovationName = 'innovationName',
  createdAt = 'createdAt',
  status = 'status'
}

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  innovationId?: string,
  innovationName?: string,
  sections?: InnovationSectionEnum[],
  status?: InnovationActionStatusEnum[],
  createdByMe?: boolean,
  fields: ('notifications')[]
}
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).append<QueryParamsType>({
  innovationId: Joi.string().guid().optional(),
  innovationName: Joi.string().trim().optional(),
  sections: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationSectionEnum))).optional(),
  status: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationActionStatusEnum))).optional(),
  createdByMe: Joi.boolean().optional(),
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('notifications')).optional()
}).required();
